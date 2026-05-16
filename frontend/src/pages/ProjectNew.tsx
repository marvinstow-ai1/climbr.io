import { useState, type FormEvent } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useSession } from "../lib/useSession";
import { useToast } from "../components/Toast";
import { createProject, type ApiError } from "../lib/api";

const FREE_KEYWORD_LIMIT = 5;
const DOMAIN_RE = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

export default function ProjectNew() {
  const session = useSession();
  const toast = useToast();
  const nav = useNavigate();

  const [domain, setDomain] = useState("");
  const [keywords, setKeywords] = useState<string[]>([""]);
  const [busy, setBusy] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  if (!session.loading && !session.token) {
    return <Navigate to="/login" replace state={{ next: "/projects/new" }} />;
  }

  const normalized = normalizeDomain(domain);
  const domainValid = normalized.length === 0 || DOMAIN_RE.test(normalized);
  const filledKeywords = keywords.map((k) => k.trim()).filter(Boolean);
  const dedupedCount = new Set(filledKeywords.map((k) => k.toLowerCase())).size;
  const canSubmit =
    normalized.length > 0 && domainValid && dedupedCount <= FREE_KEYWORD_LIMIT && !busy;

  function setKeywordAt(i: number, v: string) {
    setKeywords((arr) => arr.map((k, idx) => (idx === i ? v : k)));
  }
  function addKeywordRow() {
    if (keywords.length >= FREE_KEYWORD_LIMIT) return;
    setKeywords((arr) => [...arr, ""]);
  }
  function removeKeywordRow(i: number) {
    setKeywords((arr) => (arr.length === 1 ? [""] : arr.filter((_, idx) => idx !== i)));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDomainError(null);
    if (!session.token) return;
    if (!DOMAIN_RE.test(normalized)) {
      setDomainError("Bitte gib eine gültige Domain wie beispiel.de ein.");
      return;
    }
    setBusy(true);
    try {
      const { project } = await createProject(session.token, {
        domain: normalized,
        keywords: filledKeywords,
      });
      toast.push("success", "Projekt angelegt.");
      nav(`/projects/${project.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "DUPLICATE_PROJECT") {
        setDomainError("Für diese Domain hast du schon ein Projekt.");
      } else if (apiErr.code === "PLAN_LIMIT_REACHED") {
        toast.push("error", apiErr.message);
      } else {
        toast.push("error", apiErr.message ?? "Projekt konnte nicht angelegt werden.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-bold">Neues Projekt</h1>
      <p className="mt-2 text-slate2">
        Füge optional bis zu {FREE_KEYWORD_LIMIT} Keywords hinzu, um direkt
        mit dem Tracking zu starten. Weitere kannst du später ergänzen.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-6" noValidate>
        <div>
          <label htmlFor="domain" className="block text-sm font-medium">
            Domain
          </label>
          <input
            id="domain"
            name="domain"
            type="text"
            inputMode="url"
            autoComplete="url"
            required
            className="input mt-1"
            placeholder="dein-shop.de"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-invalid={domainError !== null || !domainValid}
            aria-describedby="domain-help domain-error"
          />
          <p id="domain-help" className="mt-1 text-xs text-slate2">
            https:// und www. entfernen wir automatisch. Normalisiert:{" "}
            <code>{normalized || "—"}</code>
          </p>
          {(domainError || !domainValid) && (
            <p id="domain-error" className="mt-1 text-sm text-red-600">
              {domainError ?? "Bitte gib eine gültige Domain wie beispiel.de ein."}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">
            Start-Keywords{" "}
            <span className="font-normal text-slate2">(optional)</span>
          </legend>
          <p className="mt-1 text-xs text-slate2">
            {dedupedCount}/{FREE_KEYWORD_LIMIT} eindeutig
          </p>
          <ul className="mt-2 space-y-2">
            {keywords.map((kw, i) => (
              <li key={i} className="flex gap-2">
                <input
                  type="text"
                  aria-label={`Keyword ${i + 1}`}
                  className="input"
                  placeholder={i === 0 ? "lederrucksack damen" : "weiteres keyword"}
                  value={kw}
                  maxLength={120}
                  onChange={(e) => setKeywordAt(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeKeywordRow(i)}
                  className="btn-ghost"
                  aria-label={`Keyword ${i + 1} entfernen`}
                  disabled={keywords.length === 1 && !kw}
                >
                  Entfernen
                </button>
              </li>
            ))}
          </ul>
          {keywords.length < FREE_KEYWORD_LIMIT && (
            <button
              type="button"
              onClick={addKeywordRow}
              className="mt-2 text-sm text-primary hover:underline"
            >
              + Weiteres Keyword
            </button>
          )}
          {dedupedCount > FREE_KEYWORD_LIMIT && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              Der kostenlose Plan erlaubt bis zu {FREE_KEYWORD_LIMIT} Keywords.
              Im bezahlten Plan sind mehr möglich.
            </p>
          )}
        </fieldset>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => nav("/dashboard")}
            className="btn-ghost"
          >
            Abbrechen
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {busy ? "Wird angelegt…" : "Projekt anlegen"}
          </button>
        </div>
      </form>
    </div>
  );
}
