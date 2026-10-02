import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getCatalog } from '@/lib/seo/wordLists/catalog';
import { collectionGraph } from '@/lib/seo/wordLists/jsonLd';
import {
  LISTS_PATH,
  gradeHubPath,
  hubLocales,
  isPageLocale,
  langHubPath,
  listPath,
  pickLocale,
  topicHubPath,
} from '@/lib/seo/wordLists/paths';
import { gradeLabel, langName, topicLabel, tr } from '@/lib/seo/wordLists/i18n';
import { wordListMetadata } from '@/lib/seo/wordLists/metadata';
import { hreflangAlternates } from '@/lib/seo/hreflang';
import { EducationRelatedLinks } from '@/components/education/EducationRelatedLinks';
import { CardGrid, LANG_ACCENT, ListsFrame, PageHeader, SectionTitle, Tag } from './_components/ui';
import { TopicChips, baseCrumbs, wordTotal } from './_views/shared';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const FEATURED = 6;

function hubCopy(locale: string) {
  const c = getCatalog();
  const vars = { lists: c.lists.length, words: wordTotal(c.lists), languages: c.langHubs.length };
  return {
    title: tr(locale, 'hub.metaTitle'),
    description: tr(locale, 'hub.metaDescription', vars),
    intro: tr(locale, 'hub.intro', vars),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPageLocale(locale)) return {};
  const c = hubCopy(locale);
  return wordListMetadata({
    locale,
    path: LISTS_PATH,
    locales: hubLocales(),
    title: c.title,
    description: c.description,
    languages: hreflangAlternates(LISTS_PATH),
  });
}

export default async function WordListsHubPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isPageLocale(locale)) notFound();
  const catalog = getCatalog();
  const c = hubCopy(locale);
  const crumbs = baseCrumbs(locale);
  const hubItems = [
    ...catalog.langHubs.map((h) => ({
      name: tr(locale, `hub.langTitle.${h.lang}`),
      href: `/${pickLocale(h.locales, locale)}${langHubPath(h.lang)}`,
    })),
    ...catalog.topicHubs.map((h) => ({
      name: topicLabel(locale, h.topic),
      href: `/${pickLocale(h.locales, locale)}${topicHubPath(h.topic)}`,
    })),
  ];
  const graph = collectionGraph({
    locale,
    path: LISTS_PATH,
    name: tr(locale, 'hub.h1'),
    description: c.description,
    items: hubItems,
    crumbs,
  });

  const ownLang = catalog.langHubs.some((h) => h.lang === locale) ? locale : 'en';
  const featured = [...new Map(catalog.lists.filter((l) => l.lang === ownLang).map((l) => [l.grade, l])).values()].slice(
    0,
    FEATURED,
  );
  const langOrder = [...catalog.langHubs].sort((a, b) =>
    a.lang === locale ? -1 : b.lang === locale ? 1 : b.lists.length - a.lists.length,
  );

  return (
    <ListsFrame locale={locale} crumbs={crumbs} graph={graph}>
      <PageHeader
        title={tr(locale, 'hub.h1')}
        intro={c.intro}
        eyebrow={<Tag tone="bg-neo-lime text-neo-navy">{tr(locale, 'hub.eyebrow')}</Tag>}
      />

      <section className="mt-14" aria-labelledby="by-language">
        <SectionTitle id="by-language">{tr(locale, 'hub.byLanguage')}</SectionTitle>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {langOrder.map((h) => {
            const accent = LANG_ACCENT[h.lang];
            return (
              <article
                key={h.lang}
                className="flex flex-col rounded-neo border-4 border-neo-cream/40 bg-neo-navy-light p-5 shadow-hard-lg"
              >
                <Link href={`/${pickLocale(h.locales, locale)}${langHubPath(h.lang)}`} className="group">
                  <span
                    className={`inline-block rounded-neo border-3 border-neo-black ${accent.fill} px-3 py-1 font-neo-display text-2xl font-black text-neo-navy shadow-hard group-hover:-translate-y-0.5`}
                  >
                    {langName(locale, h.lang)}
                  </span>
                  <p className="mt-3 text-sm font-bold text-neo-white/70">
                    {tr(locale, 'hub.langCard', { lists: h.lists.length, words: wordTotal(h.lists) })}
                  </p>
                </Link>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(h.grades.length > 0
                    ? h.grades.map((g) => ({
                        key: `g${g.grade}`,
                        grade: g.grade,
                        href: `/${pickLocale(g.locales, locale)}${gradeHubPath(h.lang, g.grade)}`,
                      }))
                    : h.lists
                        .filter((l) => l.grade)
                        .map((l) => ({
                          key: l.id,
                          grade: l.grade as number,
                          href: `/${pickLocale(l.locales, locale)}${listPath(l)}`,
                        }))
                  ).map((pill) => (
                    <Link
                      key={pill.key}
                      href={pill.href}
                      className="inline-flex min-h-[40px] items-center rounded-md border-2 border-neo-black bg-neo-white px-3 text-sm font-black text-neo-navy shadow-hard-sm hover:-translate-y-0.5"
                    >
                      {gradeLabel(locale, pill.grade)}
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
        {locale !== 'en' && <p className="mt-5 max-w-2xl text-sm font-bold text-neo-white/70">{tr(locale, 'hub.eflNote')}</p>}
      </section>

      <TopicChips locale={locale} title={tr(locale, 'hub.byTopic')} hubs={catalog.topicHubs} />

      <section className="mt-14" aria-labelledby="featured">
        <SectionTitle id="featured">{tr(locale, 'hub.langTitle.' + ownLang)}</SectionTitle>
        <CardGrid lists={featured} locale={locale} />
      </section>

      <EducationRelatedLinks locale={locale} slug="lists" />
    </ListsFrame>
  );
}
