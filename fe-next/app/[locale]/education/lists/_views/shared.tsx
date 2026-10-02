import type { Crumb } from '@/lib/seo/wordLists/jsonLd';
import type { ListLang } from '@/lib/seo/wordLists/model';
import { getCatalog, type GradeHub, type TopicHub } from '@/lib/seo/wordLists/catalog';
import { LISTS_PATH, gradeHubPath, langHubPath, pickLocale, topicHubPath } from '@/lib/seo/wordLists/paths';
import { gradeLabel, topicLabel, tr } from '@/lib/seo/wordLists/i18n';
import { ChipLink, SectionTitle } from '../_components/ui';

export function baseCrumbs(locale: string): Crumb[] {
  return [
    { name: tr(locale, 'nav.education'), path: '/education' },
    { name: tr(locale, 'nav.lists'), path: LISTS_PATH },
  ];
}

export function langCrumb(locale: string, lang: ListLang): Crumb {
  return { name: tr(locale, `hub.langTitle.${lang}`), path: langHubPath(lang) };
}

export function gradeCrumb(locale: string, lang: ListLang, grade: number): Crumb {
  return { name: gradeLabel(locale, grade), path: gradeHubPath(lang, grade) };
}

export function GradeChips({
  locale,
  hubs,
  activeGrade,
  title,
}: {
  locale: string;
  hubs: GradeHub[];
  activeGrade?: number;
  title: string;
}) {
  if (hubs.length === 0) return null;
  return (
    <section className="mt-14">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-4 flex flex-wrap gap-3">
        {hubs.map((h) => (
          <ChipLink
            key={`${h.lang}-${h.grade}`}
            href={`/${pickLocale(h.locales, locale)}${gradeHubPath(h.lang, h.grade)}`}
            active={h.grade === activeGrade}
          >
            {gradeLabel(locale, h.grade)}
            <span className="text-xs opacity-60">{h.lists.length}</span>
          </ChipLink>
        ))}
      </div>
    </section>
  );
}

export function TopicChips({
  locale,
  hubs,
  activeTopic,
  title,
}: {
  locale: string;
  hubs: TopicHub[];
  activeTopic?: string;
  title: string;
}) {
  if (hubs.length === 0) return null;
  return (
    <section className="mt-14">
      <SectionTitle>{title}</SectionTitle>
      <div className="mt-4 flex flex-wrap gap-3">
        {hubs.map((h) => (
          <ChipLink
            key={h.topic}
            href={`/${pickLocale(h.locales, locale)}${topicHubPath(h.topic)}`}
            active={h.topic === activeTopic}
          >
            {topicLabel(locale, h.topic)}
            <span className="text-xs opacity-60">{h.lists.length}</span>
          </ChipLink>
        ))}
      </div>
    </section>
  );
}

export function topicHubsFor(predicate: (h: TopicHub) => boolean): TopicHub[] {
  return getCatalog().topicHubs.filter(predicate);
}

export function wordTotal(lists: Array<{ words: unknown[] }>): number {
  return lists.reduce((n, l) => n + l.words.length, 0);
}
