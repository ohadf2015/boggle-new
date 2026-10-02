import Link from 'next/link';
import type { Metadata } from 'next';
import { getCatalog, type GradeHub, type LangHub, type TopicHub } from '@/lib/seo/wordLists/catalog';
import { collectionGraph } from '@/lib/seo/wordLists/jsonLd';
import type { WordList } from '@/lib/seo/wordLists/model';
import { gradeHubPath, langHubPath, listPath, pickLocale, topicHubPath } from '@/lib/seo/wordLists/paths';
import { displayTitle, gradeLabel, langName, topicLabel, tr, wordsIn } from '@/lib/seo/wordLists/i18n';
import { wordListMetadata } from '@/lib/seo/wordLists/metadata';
import { EducationRelatedLinks } from '@/components/education/EducationRelatedLinks';
import { CardGrid, LANG_ACCENT, ListsFrame, PageHeader, SectionTitle, Tag } from '../_components/ui';
import { GradeChips, TopicChips, baseCrumbs, gradeCrumb, langCrumb, topicHubsFor, wordTotal } from './shared';

const PREVIEW_PER_GRADE = 3;

function items(lists: WordList[], locale: string) {
  return lists.map((l) => ({ name: displayTitle(l, locale).title, href: `/${pickLocale(l.locales, locale)}${listPath(l)}` }));
}

/* ---------- language hub ---------- */

function langCopy(hub: LangHub, locale: string) {
  const vars = { lists: hub.lists.length, words: wordTotal(hub.lists), wordsIn: wordsIn(locale, hub.lang) };
  return {
    title: tr(locale, `hub.langTitle.${hub.lang}`),
    description: tr(locale, 'hub.langMetaDescription', vars),
    intro: tr(locale, 'hub.langIntro', vars),
  };
}

export function langHubMetadata(hub: LangHub, locale: string): Metadata {
  const c = langCopy(hub, locale);
  return wordListMetadata({
    locale,
    path: langHubPath(hub.lang),
    locales: hub.locales,
    title: c.title,
    description: c.description,
  });
}

export function LangHubView({ hub, locale }: { hub: LangHub; locale: string }) {
  const c = langCopy(hub, locale);
  const crumbs = [...baseCrumbs(locale), langCrumb(locale, hub.lang)];
  const path = langHubPath(hub.lang);
  const graph = collectionGraph({
    locale,
    path,
    name: c.title,
    description: c.description,
    items: items(hub.lists, locale),
    crumbs,
  });
  const grades = [...new Set(hub.lists.map((l) => l.grade))].sort((a, b) => (a ?? 99) - (b ?? 99));
  const accent = LANG_ACCENT[hub.lang];
  return (
    <ListsFrame locale={locale} crumbs={crumbs} graph={graph}>
      <PageHeader
        accent={accent.fill}
        title={c.title}
        intro={c.intro}
        eyebrow={<Tag tone={`${accent.fill} text-neo-navy`}>{tr(locale, 'count.lists', { count: hub.lists.length })}</Tag>}
      />
      {hub.lang === 'en' && locale !== 'en' && (
        <p className="mt-6 max-w-2xl rounded-neo border-3 border-neo-black bg-neo-cyan px-4 py-3 font-bold text-neo-navy shadow-hard">
          {tr(locale, 'hub.eflNote')}
        </p>
      )}
      {grades.map((grade) => {
        const lists = hub.lists.filter((l) => l.grade === grade);
        const gh = hub.grades.find((g) => g.grade === grade);
        return (
          <section key={grade ?? 'none'} className="mt-14">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <SectionTitle>{grade ? gradeLabel(locale, grade) : tr(locale, `vocab.${hub.lang}`)}</SectionTitle>
              {gh && (
                <Link
                  href={`/${pickLocale(gh.locales, locale)}${gradeHubPath(hub.lang, gh.grade)}`}
                  className="rounded-neo border-3 border-neo-black bg-neo-white px-4 py-2 text-sm font-black text-neo-navy shadow-hard"
                >
                  {tr(locale, 'hub.viewAll', { count: gh.lists.length })}
                </Link>
              )}
            </div>
            <CardGrid lists={lists.slice(0, PREVIEW_PER_GRADE)} locale={locale} />
          </section>
        );
      })}
      <TopicChips
        locale={locale}
        title={tr(locale, 'hub.byTopic')}
        hubs={topicHubsFor((h) => h.lists.some((l) => l.lang === hub.lang))}
      />
      <EducationRelatedLinks locale={locale} slug="lists" />
    </ListsFrame>
  );
}

/* ---------- grade hub ---------- */

function topicSummary(lists: WordList[], locale: string): string {
  return [...new Set(lists.map((l) => topicLabel(locale, l.topic)))].slice(0, 4).join(', ');
}

function gradeCopy(hub: GradeHub, locale: string) {
  const grade = gradeLabel(locale, hub.grade);
  const vars = {
    grade,
    language: langName(locale, hub.lang),
    wordsIn: wordsIn(locale, hub.lang),
    lists: hub.lists.length,
    words: wordTotal(hub.lists),
    topics: topicSummary(hub.lists, locale),
  };
  return {
    title: tr(locale, 'hub.gradeTitle', vars),
    description: tr(locale, 'hub.gradeMetaDescription', vars),
    intro: tr(locale, 'hub.gradeIntro', vars),
  };
}

export function gradeHubMetadata(hub: GradeHub, locale: string): Metadata {
  const c = gradeCopy(hub, locale);
  return wordListMetadata({
    locale,
    path: gradeHubPath(hub.lang, hub.grade),
    locales: hub.locales,
    title: c.title,
    description: c.description,
  });
}

export function GradeHubView({ hub, locale }: { hub: GradeHub; locale: string }) {
  const c = gradeCopy(hub, locale);
  const crumbs = [...baseCrumbs(locale), langCrumb(locale, hub.lang), gradeCrumb(locale, hub.lang, hub.grade)];
  const path = gradeHubPath(hub.lang, hub.grade);
  const graph = collectionGraph({
    locale,
    path,
    name: c.title,
    description: c.description,
    items: items(hub.lists, locale),
    crumbs,
  });
  const accent = LANG_ACCENT[hub.lang];
  const siblings = getCatalog().gradeHubs.filter((h) => h.lang === hub.lang);
  return (
    <ListsFrame locale={locale} crumbs={crumbs} graph={graph}>
      <PageHeader
        accent={accent.fill}
        title={c.title}
        intro={c.intro}
        eyebrow={
          <>
            <Tag tone={`${accent.fill} text-neo-navy`}>{langName(locale, hub.lang)}</Tag>
            <Tag>{tr(locale, 'count.lists', { count: hub.lists.length })}</Tag>
          </>
        }
      />
      <CardGrid lists={hub.lists} locale={locale} />
      <GradeChips locale={locale} hubs={siblings} activeGrade={hub.grade} title={tr(locale, 'hub.otherGrades')} />
      <TopicChips
        locale={locale}
        title={tr(locale, 'hub.byTopic')}
        hubs={topicHubsFor((h) => hub.lists.some((l) => l.topic === h.topic))}
      />
      <EducationRelatedLinks locale={locale} slug="lists" />
    </ListsFrame>
  );
}

/* ---------- topic hub ---------- */

function topicCopy(hub: TopicHub, locale: string) {
  const vars = { topic: topicLabel(locale, hub.topic), lists: hub.lists.length, words: wordTotal(hub.lists) };
  return {
    title: tr(locale, 'hub.topicTitle', vars),
    description: tr(locale, 'hub.topicMetaDescription', vars),
    intro: tr(locale, 'hub.topicIntro', vars),
  };
}

export function topicHubMetadata(hub: TopicHub, locale: string): Metadata {
  const c = topicCopy(hub, locale);
  return wordListMetadata({
    locale,
    path: topicHubPath(hub.topic),
    locales: hub.locales,
    title: c.title,
    description: c.description,
  });
}

export function TopicHubView({ hub, locale }: { hub: TopicHub; locale: string }) {
  const c = topicCopy(hub, locale);
  const path = topicHubPath(hub.topic);
  const crumbs = [...baseCrumbs(locale), { name: c.title, path }];
  const graph = collectionGraph({
    locale,
    path,
    name: c.title,
    description: c.description,
    items: items(hub.lists, locale),
    crumbs,
  });
  const langs = [...new Set(hub.lists.map((l) => l.lang))].sort((a, b) => (a === locale ? -1 : b === locale ? 1 : 0));
  return (
    <ListsFrame locale={locale} crumbs={crumbs} graph={graph}>
      <PageHeader
        accent="bg-neo-purple"
        title={c.title}
        intro={c.intro}
        eyebrow={<Tag tone="bg-neo-purple text-neo-white">{tr(locale, 'count.lists', { count: hub.lists.length })}</Tag>}
      />
      {langs.map((lang) => (
        <section key={lang} className="mt-14">
          <SectionTitle>{tr(locale, `hub.langTitle.${lang}`)}</SectionTitle>
          <CardGrid lists={hub.lists.filter((l) => l.lang === lang)} locale={locale} />
        </section>
      ))}
      <TopicChips locale={locale} title={tr(locale, 'hub.otherTopics')} hubs={getCatalog().topicHubs} activeTopic={hub.topic} />
      <EducationRelatedLinks locale={locale} slug="lists" />
    </ListsFrame>
  );
}
