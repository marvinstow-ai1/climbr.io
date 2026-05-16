import { useMemo, useState } from "react";
import {
  WIKI_ARTICLES,
  WIKI_CATEGORIES,
  filterByCategory,
  searchArticles,
  type WikiCategory,
} from "../../data/wiki";
import { WikiCard } from "../../components/wiki/WikiCard";

type CategoryFilter = WikiCategory | "Alle";

export default function WikiIndex() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("Alle");

  const filtered = useMemo(() => {
    const searched = searchArticles(query);
    return filterByCategory(searched, category);
  }, [query, category]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6" data-testid="wiki-index">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold sm:text-3xl">SEO Wiki</h1>
        <p className="text-ink-muted">
          Kurze Erklärungen zu den wichtigsten SEO-Begriffen — geschrieben für
          Shop-Betreiber und Selbstständige ohne SEO-Vorkenntnisse.
        </p>
      </header>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor="wiki-search" className="block text-sm font-medium text-ink">
            Suche
          </label>
          <input
            id="wiki-search"
            type="search"
            placeholder="z.B. Title Tag, Sitemap, Keyword …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input mt-1"
            data-testid="wiki-search-input"
          />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Kategorien">
        {(["Alle", ...WIKI_CATEGORIES] as const).map((c) => {
          const active = c === category;
          return (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setCategory(c)}
              data-testid={`wiki-filter-${c}`}
              className={`rounded-full px-3 py-1 text-sm transition ${
                active
                  ? "bg-accent text-white"
                  : "border border-line text-ink-muted hover:bg-white/[0.02]"
              }`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-ink-muted" data-testid="wiki-result-count">
        {filtered.length === WIKI_ARTICLES.length
          ? `${WIKI_ARTICLES.length} Artikel`
          : `${filtered.length} von ${WIKI_ARTICLES.length} Artikeln`}
      </p>

      {filtered.length === 0 ? (
        <div className="card mt-4 text-center text-ink-muted">
          Keine Artikel gefunden. Versuch einen anderen Suchbegriff.
        </div>
      ) : (
        <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((a) => (
            <li key={a.slug}>
              <WikiCard article={a} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
