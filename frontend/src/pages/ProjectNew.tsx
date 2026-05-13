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
      setDomainError("Please enter a valid domain like example.com");
      return;
    }
    setBusy(true);
    try {
      const { project } = await createProject(session.token, {
        domain: normalized,
        keywords: filledKeywords,
      });
      toast.push("success", "Project created");
      nav(`/projects/${project.id}`);
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr.code === "DUPLICATE_PROJECT") {
        setDomainError("You already have a project for that domain.");
      } else if (apiErr.code === "PLAN_LIMIT_REACHED") {
        toast.push("error", apiErr.message);
      } else {
        toast.push("error", apiErr.message ?? "Could not create project");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl px-6 py-12">
      <h1 className="text-3xl font-bold">Create project</h1>
      <p className="mt-2 text-slate2">
        Add an optional list of up to {FREE_KEYWORD_LIMIT} keywords to start
        tracking immediately. You can add more later.
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
            placeholder="your-shop.com"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            aria-invalid={domainError !== null || !domainValid}
            aria-describedby="domain-help domain-error"
          />
          <p id="domain-help" className="mt-1 text-xs text-slate2">
            We'll strip https:// and www. for you. Normalized: <code>{normalized || "—"}</code>
          </p>
          {(domainError || !domainValid) && (
            <p id="domain-error" className="mt-1 text-sm text-red-600">
              {domainError ?? "Please enter a valid domain like example.com"}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="text-sm font-medium">
            Starter keywords <span className="text-slate2 font-normal">(optional)</span>
          </legend>
          <p className="mt-1 text-xs text-slate2">
            {dedupedCount}/{FREE_KEYWORD_LIMIT} unique
          </p>
          <ul className="mt-2 space-y-2">
            {keywords.map((kw, i) => (
              <li key={i} className="flex gap-2">
                <input
                  type="text"
                  aria-label={`Keyword ${i + 1}`}
                  className="input"
                  placeholder={i === 0 ? "leather backpack" : "another keyword"}
                  value={kw}
                  maxLength={120}
                  onChange={(e) => setKeywordAt(i, e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeKeywordRow(i)}
                  className="btn-ghost"
                  aria-label={`Remove keyword ${i + 1}`}
                  disabled={keywords.length === 1 && !kw}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          {keywords.length < FREE_KEYWORD_LIMIT && (
            <button type="button" onClick={addKeywordRow} className="mt-2 text-sm text-primary hover:underline">
              + Add another keyword
            </button>
          )}
          {dedupedCount > FREE_KEYWORD_LIMIT && (
            <p className="mt-1 text-sm text-red-600" role="alert">
              Free plan tracks up to {FREE_KEYWORD_LIMIT} keywords. Upgrade to add more.
            </p>
          )}
        </fieldset>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => nav("/dashboard")} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={!canSubmit}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </div>
      </form>
    </div>
  );
}
