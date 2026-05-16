/**
 * Sehr einfacher Markdown-Renderer für die Wiki-Artikel.
 *
 * Unterstützte Syntax (alles was unsere Artikel brauchen):
 *   - Absätze (Leerzeilen trennen)
 *   - `## Heading 2` und `### Heading 3`
 *   - Aufzählungen mit `- ` am Zeilenanfang
 *   - Inline-Code mit \`backticks\`
 *   - **fett** und *kursiv*
 *   - Code-Blöcke ```...```
 *   - einfache Tabellen mit `|`
 *
 * Bewusst minimal — wir wollen kein vollständiges Markdown-Lib in den Bundle.
 */
import type { ReactNode } from "react";

interface Props {
  body: string;
}

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "p"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "pre"; code: string }
  | { kind: "table"; head: string[]; rows: string[][] };

export function WikiBody({ body }: Props) {
  const blocks = parse(body);
  return (
    <div className="space-y-4 text-sm leading-relaxed text-ink-muted">
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

function renderBlock(b: Block, key: number): ReactNode {
  switch (b.kind) {
    case "h2":
      return (
        <h2 key={key} className="mt-6 text-lg font-semibold text-ink">
          {renderInline(b.text)}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="mt-4 text-base font-medium text-ink">
          {renderInline(b.text)}
        </h3>
      );
    case "p":
      return <p key={key}>{renderInline(b.text)}</p>;
    case "ul":
      return (
        <ul key={key} className="list-disc space-y-1 pl-6">
          {b.items.map((it, j) => (
            <li key={j}>{renderInline(it)}</li>
          ))}
        </ul>
      );
    case "pre":
      return (
        <pre
          key={key}
          className="overflow-x-auto rounded-md bg-black/40 p-3 text-xs leading-snug text-ink"
        >
          <code>{b.code}</code>
        </pre>
      );
    case "table":
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead className="bg-white/[0.02]">
              <tr>
                {b.head.map((h, j) => (
                  <th
                    key={j}
                    className="border border-line px-2 py-1 text-left font-semibold text-ink"
                  >
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {b.rows.map((row, j) => (
                <tr key={j}>
                  {row.map((cell, k) => (
                    <td key={k} className="border border-line px-2 py-1">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

function parse(body: string): Block[] {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    if (!line.trim()) {
      i++;
      continue;
    }

    // Code block
    if (line.trim().startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith("```")) {
        code.push(lines[i]!);
        i++;
      }
      i++; // skip closing ```
      blocks.push({ kind: "pre", code: code.join("\n") });
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push({ kind: "h3", text: line.slice(4).trim() });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "h2", text: line.slice(3).trim() });
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /\|\s*[-: ]+\s*\|/.test(lines[i + 1]!)) {
      const head = splitTable(line);
      i += 2; // skip separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes("|")) {
        rows.push(splitTable(lines[i]!));
        i++;
      }
      blocks.push({ kind: "table", head, rows });
      continue;
    }

    // Unordered list
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("- ")) {
        items.push(lines[i]!.slice(2).trim());
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }

    // Paragraph (consume until blank line)
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i]!.trim() && !isBlockStart(lines[i]!)) {
      para.push(lines[i]!);
      i++;
    }
    blocks.push({ kind: "p", text: para.join(" ") });
  }
  return blocks;
}

function isBlockStart(line: string): boolean {
  return (
    line.startsWith("## ") ||
    line.startsWith("### ") ||
    line.startsWith("- ") ||
    line.trim().startsWith("```") ||
    line.includes("|")
  );
}

function splitTable(line: string): string[] {
  return line
    .split("|")
    .map((c) => c.trim())
    .filter((_, i, arr) => !(i === 0 && arr[0] === "") && !(i === arr.length - 1 && arr[arr.length - 1] === ""));
}

/**
 * Render inline markdown: **bold**, *italic*, `code`, [text](url).
 * Bewusst kein Regex-Goldgrad — die Wiki-Texte sind kontrolliert.
 */
function renderInline(text: string): ReactNode {
  const tokens = tokenize(text);
  return tokens.map((t, i) => {
    if (t.kind === "code")
      return (
        <code key={i} className="rounded bg-white/[0.04] px-1 py-0.5 font-mono text-xs">
          {t.text}
        </code>
      );
    if (t.kind === "strong") return <strong key={i} className="text-ink">{t.text}</strong>;
    if (t.kind === "em") return <em key={i}>{t.text}</em>;
    if (t.kind === "link")
      return (
        <a key={i} href={t.url} className="text-accent underline" target="_blank" rel="noopener noreferrer">
          {t.text}
        </a>
      );
    return <span key={i}>{t.text}</span>;
  });
}

type Token =
  | { kind: "text"; text: string }
  | { kind: "code"; text: string }
  | { kind: "strong"; text: string }
  | { kind: "em"; text: string }
  | { kind: "link"; text: string; url: string };

function tokenize(s: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end === -1) {
        out.push({ kind: "text", text: s.slice(i) });
        break;
      }
      out.push({ kind: "code", text: s.slice(i + 1, end) });
      i = end + 1;
      continue;
    }
    if (s.startsWith("**", i)) {
      const end = s.indexOf("**", i + 2);
      if (end === -1) {
        out.push({ kind: "text", text: s.slice(i) });
        break;
      }
      out.push({ kind: "strong", text: s.slice(i + 2, end) });
      i = end + 2;
      continue;
    }
    if (s[i] === "[") {
      const closeBracket = s.indexOf("]", i);
      if (closeBracket !== -1 && s[closeBracket + 1] === "(") {
        const closeParen = s.indexOf(")", closeBracket + 2);
        if (closeParen !== -1) {
          out.push({
            kind: "link",
            text: s.slice(i + 1, closeBracket),
            url: s.slice(closeBracket + 2, closeParen),
          });
          i = closeParen + 1;
          continue;
        }
      }
    }
    // plain text — accumulate until next special char
    let j = i;
    while (j < s.length && s[j] !== "`" && !s.startsWith("**", j) && s[j] !== "[") j++;
    out.push({ kind: "text", text: s.slice(i, j) });
    i = j;
  }
  return out;
}
