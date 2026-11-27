import { LinkPills } from '@/components/landing/kit';
import {
  EDUCATION_PAGES,
  educationPageLabel,
  educationPagePath,
  educationRelatedPages,
} from '@/lib/seo/educationPageLinks';
import { wordListRail } from '@/lib/seo/wordLists/rail';
import { tr } from '@/lib/seo/wordLists/i18n';

const RELATED_TITLE: Record<string, string> = {
  en: 'Related topics',
  he: 'נושאים קשורים',
  es: 'Temas relacionados',
  sv: 'Relaterade ämnen',
  ja: '関連トピック',
  ru: 'Связанные темы',
};

const H2 = 'font-neo-display text-xl font-bold sm:text-2xl';

/** Same link set as the shared education rail: curated `extra` first, then the rotation, plus word lists. */
export function EducationKitRelated({
  locale,
  slug,
  extra = [],
  count = 3,
}: {
  locale: string;
  slug: string;
  extra?: { href: string; label: string }[];
  count?: number;
}) {
  const title = RELATED_TITLE[locale] ?? RELATED_TITLE.en;
  const seen = new Set<string>([educationPagePath(slug), ...extra.map((e) => e.href)]);
  const rotation = educationRelatedPages(slug, EDUCATION_PAGES.length - 1)
    .map((p) => ({ href: educationPagePath(p.slug), label: educationPageLabel(p.slug, locale) }))
    .filter((p) => !seen.has(p.href))
    .slice(0, Math.max(0, count - extra.length));
  const links = [...extra, ...rotation];
  const rail = slug === 'lists' ? [] : wordListRail(slug, locale);
  if (links.length === 0 && rail.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      {rail.length > 0 && (
        <nav data-word-list-rail aria-label={tr(locale, 'rail.title')} className="flex flex-col gap-3">
          <h2 className={H2}>{tr(locale, 'rail.title')}</h2>
          <LinkPills items={rail} />
        </nav>
      )}
      {links.length > 0 && (
        <nav aria-label={title} className="flex flex-col gap-3">
          <h2 className={H2}>{title}</h2>
          <LinkPills items={links.map((l) => ({ href: `/${locale}${l.href}`, label: l.label }))} />
        </nav>
      )}
    </div>
  );
}
