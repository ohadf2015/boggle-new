import Link from 'next/link';
import {
  EDUCATION_PAGES,
  educationPageLabel,
  educationPagePath,
  educationRelatedPages,
} from '@/lib/seo/educationPageLinks';
import type { EducationAccent } from '@/lib/seo/educationLanding';

/**
 * The "Related" rail every education landing page renders.
 *
 * Before this existed, related links were hand-picked per page and the result was
 * a one-way silo: the six older pages linked only to each other, and the six newer
 * ones — the deepest content in the module — were linked from nowhere at all. The
 * sibling set here comes from `educationRelatedPages`, a rotation over the shared
 * registry, so every page both links out and gets linked to, and a page added
 * tomorrow is woven in without anyone editing twelve files.
 *
 * Curated links are not thrown away: pass them as `extra` and they render first,
 * with the rotation filling in behind them and duplicates dropped.
 */

const ACCENT_TEXT: Record<EducationAccent, string> = {
  lime: 'text-neo-lime',
  pink: 'text-neo-pink',
  cyan: 'text-neo-cyan',
  purple: 'text-neo-purple',
};

/** Harvested from the teacher-moment pages' `labels.relatedTitle`. Not translated here. */
const RELATED_TITLE: Record<string, string> = {
  en: 'Related topics',
  he: 'נושאים קשורים',
  es: 'Temas relacionados',
  sv: 'Relaterade ämnen',
  ja: '関連トピック',
  ru: 'Связанные темы',
};

export type RelatedExtra = { href: string; label: string; accent: EducationAccent };

export function educationRelatedTitle(locale: string): string {
  return RELATED_TITLE[locale] ?? RELATED_TITLE.en;
}

export function EducationRelatedLinks({
  locale,
  slug,
  extra = [],
  count = 3,
}: {
  locale: string;
  /** The current page's directory name, so it never links to itself. */
  slug: string;
  extra?: RelatedExtra[];
  count?: number;
}) {
  const title = educationRelatedTitle(locale);
  const seen = new Set<string>([educationPagePath(slug), ...extra.map((e) => e.href)]);

  const rotation = educationRelatedPages(slug, EDUCATION_PAGES.length - 1)
    .map((p) => ({
      href: educationPagePath(p.slug),
      label: educationPageLabel(p.slug, locale),
      accent: p.accent,
    }))
    .filter((p) => !seen.has(p.href))
    .slice(0, Math.max(0, count - extra.length));

  const links = [...extra, ...rotation];
  if (links.length === 0) return null;

  return (
    <nav className="mt-16" aria-label={title}>
      <h2 className="mb-4 font-neo-display text-xl font-black uppercase tracking-wide text-neo-white">
        {title}
      </h2>
      <div className="flex flex-wrap gap-3 text-sm font-bold">
        {links.map((r) => (
          <Link
            key={r.href}
            href={`/${locale}${r.href}`}
            className={`rounded-neo border-2 border-neo-black bg-neo-navy-light px-4 py-2 ${ACCENT_TEXT[r.accent]} transition-colors hover:bg-neo-navy`}
          >
            {r.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
