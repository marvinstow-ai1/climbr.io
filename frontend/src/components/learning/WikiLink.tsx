import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  /** Wiki-Slug, z.B. "title-tag" — auflösbar zu /wiki/title-tag. */
  slug: string;
  children: ReactNode;
}

/**
 * Dezenter Inline-Link zum passenden Wiki-Artikel. Wird überall in der
 * App gestreut, wo ein SEO-Konzept erklärt werden könnte. Der Wiki-Artikel
 * selbst entsteht in Bereich 5.
 */
export function WikiLink({ slug, children }: Props) {
  return (
    <Link
      to={`/wiki/${slug}`}
      className="inline-flex items-center gap-0.5 text-primary hover:underline"
      data-testid={`wiki-link-${slug}`}
    >
      {children}
      <span aria-hidden="true">→</span>
    </Link>
  );
}
