import { Link, useParams } from "react-router-dom";
import { getArticle, WIKI_ARTICLES } from "../../data/wiki";
import { WikiBody } from "../../components/wiki/WikiBody";

export default function WikiArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = slug ? getArticle(slug) : null;

  if (!article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <p className="text-slate2">
          Artikel nicht gefunden.{" "}
          <Link to="/wiki" className="text-primary underline">
            Zur Wiki-Übersicht
          </Link>
        </p>
      </div>
    );
  }

  const related = article.relatedSlugs
    .map((s) => WIKI_ARTICLES.find((a) => a.slug === s))
    .filter(Boolean) as typeof WIKI_ARTICLES;

  return (
    <article
      className="mx-auto max-w-3xl px-4 py-8 sm:px-6"
      data-testid={`wiki-article-${article.slug}`}
    >
      <nav className="mb-4 text-xs text-slate2">
        <Link to="/wiki" className="hover:underline">SEO Wiki</Link>
        <span aria-hidden="true"> / </span>
        <span>{article.category}</span>
      </nav>

      <header>
        <span className="inline-flex items-center rounded-md bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary">
          {article.category}
        </span>
        <h1 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">{article.title}</h1>
        <p className="mt-1 text-xs text-slate2">{article.readingTime} Min. Lesezeit</p>
        <p className="mt-3 text-base text-slate2">{article.summary}</p>
      </header>

      <hr className="my-6 border-slate-200" />

      <WikiBody body={article.body} />

      {related.length > 0 && (
        <aside className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h2 className="text-sm font-semibold text-ink">Verwandte Artikel</h2>
          <ul className="mt-2 space-y-1">
            {related.map((r) => (
              <li key={r.slug}>
                <Link
                  to={`/wiki/${r.slug}`}
                  className="text-sm text-primary hover:underline"
                >
                  {r.title} →
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
