import { Link } from "react-router-dom";
import type { WikiArticle } from "../../data/wiki";

interface Props {
  article: WikiArticle;
}

export function WikiCard({ article }: Props) {
  return (
    <Link
      to={`/wiki/${article.slug}`}
      className="card flex h-full flex-col gap-2 transition hover:border-accent"
      data-testid={`wiki-card-${article.slug}`}
    >
      <span className="inline-flex w-fit items-center rounded-md bg-accent-dim px-2 py-0.5 text-xs font-medium text-accent">
        {article.category}
      </span>
      <h3 className="text-base font-semibold text-ink">{article.title}</h3>
      <p className="text-sm text-ink-muted">{article.summary}</p>
      <p className="mt-auto text-xs text-ink-muted">{article.readingTime} Min. Lesezeit</p>
    </Link>
  );
}
