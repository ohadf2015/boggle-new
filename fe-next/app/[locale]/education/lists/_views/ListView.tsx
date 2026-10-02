import Link from 'next/link';
import type { Metadata } from 'next';
import { GeoFaqList } from '@/components/seo/GeoFaqList';
import { EducationRelatedLinks } from '@/components/education/EducationRelatedLinks';
import { getCatalog, relatedLists } from '@/lib/seo/wordLists/catalog';
import { listGraph } from '@/lib/seo/wordLists/jsonLd';
import { playableWord, type WordList } from '@/lib/seo/wordLists/model';
import { LISTS_PATH, gradeHubPath, langHubPath, listPath, pickLocale, topicHubPath } from '@/lib/seo/wordLists/paths';
import { displayTitle, glossPhrase, gradeLabel, langName, metaName, sampleWords, topicLabel, tr, wordsIn } from '@/lib/seo/wordLists/i18n';
import { wordListMetadata } from '@/lib/seo/wordLists/metadata';
import { CardGrid, ChipLink, LANG_ACCENT, ListsFrame, PageHeader, SectionTitle, Tag } from '../_components/ui';
import { ListActions } from '../_components/ListActions';
import { BoardPreview } from '../_components/BoardPreview';
import { baseCrumbs, gradeCrumb, langCrumb } from './shared';

/** Past ~60 characters a results page cuts the title; drop the class-game tail first. */
const MAX_TITLE = 60;

function copy(list: WordList, locale: string) {
  const { title, subtitle } = displayTitle(list, locale);
  const grade = list.grade ? gradeLabel(locale, list.grade) : null;
  const vars = {
    title,
    count: list.words.length,
    wordsIn: wordsIn(locale, list.lang),
    language: langName(locale, list.lang),
    sample: sampleWords(list),
    grade: grade ?? '',
  };
  const suffix = grade ? '' : 'NoGrade';
  const titleVars = { ...vars, name: metaName(list, locale) };
  const long = tr(locale, `detail.metaTitle${suffix}`, titleVars);
  const gloss = glossPhrase(list, locale);
  return {
    title,
    subtitle,
    grade,
    vars,
    metaTitle: long.length <= MAX_TITLE ? long : tr(locale, `detail.metaTitleShort${suffix}`, titleVars),
    description: gloss ? tr(locale, 'detail.metaDescription', { ...vars, gloss }) : tr(locale, 'detail.metaDescriptionPlain', vars),
    // Isolate the sample so foreign-script words do not reorder an RTL sentence.
    intro: tr(locale, grade ? 'detail.intro' : 'detail.introNoGrade', { ...vars, sample: `\u2068${vars.sample}\u2069` }),
  };
}

export function listMetadata(list: WordList, locale: string): Metadata {
  const c = copy(list, locale);
  return wordListMetadata({
    locale,
    path: listPath(list),
    locales: list.locales,
    title: c.metaTitle,
    description: c.description,
  });
}

export function ListView({ list, locale }: { list: WordList; locale: string }) {
  const c = copy(list, locale);
  const catalog = getCatalog();
  const gradeHub = catalog.gradeHubs.find((h) => h.lang === list.lang && h.grade === list.grade) ?? null;
  const topicHub = catalog.topicHubs.find((h) => h.topic === list.topic) ?? null;
  const langHub = catalog.langHubs.find((h) => h.lang === list.lang)!;
  const topic = topicLabel(locale, list.topic);

  const crumbs = [
    ...baseCrumbs(locale),
    langCrumb(locale, list.lang),
    ...(gradeHub && list.grade ? [gradeCrumb(locale, list.lang, list.grade)] : []),
    { name: c.title, path: listPath(list) },
  ];
  const graph = listGraph({ list, locale, title: c.title, description: c.description, topic, gradeName: c.grade, crumbs });
  const accent = LANG_ACCENT[list.lang];
  const neighbours = catalog.gradeHubs.filter((h) => h.lang === list.lang && list.grade && Math.abs(h.grade - list.grade) === 1);
  const faqs = [
    { q: tr(locale, 'detail.faq1q', c.vars), a: tr(locale, 'detail.faq1a') },
    { q: tr(locale, 'detail.faq2q'), a: tr(locale, 'detail.faq2a') },
    { q: tr(locale, 'detail.faq3q'), a: tr(locale, 'detail.faq3a') },
  ];
  const accessHref = `/${locale}/education/access?from=${encodeURIComponent(`/${locale}${listPath(list)}`)}`;

  return (
    <ListsFrame locale={locale} crumbs={crumbs} graph={graph}>
      <div className="grid gap-10 lg:grid-cols-3 lg:items-start">
        <div className="min-w-0 lg:col-span-2">
          <PageHeader
            accent={accent.fill}
            title={c.title}
            subtitle={c.subtitle}
            intro={c.intro}
            eyebrow={
              <>
                <Tag tone={`${accent.fill} text-neo-navy`}>{tr(locale, `lang.${list.lang}`)}</Tag>
                {c.grade && <Tag>{c.grade}</Tag>}
                <Tag tone="bg-neo-purple text-neo-white">{topic}</Tag>
                <Tag tone="border-neo-cream/40 bg-neo-navy-light text-neo-white">{tr(locale, 'count.words', { count: list.words.length })}</Tag>
              </>
            }
          />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-neo-white/50">
            {list.origin === 'teacher' && list.author
              ? tr(locale, 'detail.byAuthor', { author: list.author })
              : tr(locale, 'detail.curated')}
          </p>

          <ListActions
            locale={locale}
            path={listPath(list)}
            title={c.title}
            lang={list.lang}
            words={list.words}
            playable={list.words.map((w) => playableWord(w.word))}
            labels={{
              playClass: tr(locale, 'detail.playClass'),
              playClassSub: tr(locale, 'detail.playClassSub'),
              practiceSolo: tr(locale, 'detail.practiceSolo'),
              practiceSoloSub: tr(locale, 'detail.practiceSoloSub'),
              modesTitle: tr(locale, 'detail.modesTitle'),
              modes: {
                grid: { title: tr(locale, 'detail.modes.grid'), sub: tr(locale, 'detail.modes.gridSub') },
                spelling: { title: tr(locale, 'detail.modes.spelling'), sub: tr(locale, 'detail.modes.spellingSub') },
                matching: { title: tr(locale, 'detail.modes.matching'), sub: tr(locale, 'detail.modes.matchingSub') },
              },
              close: tr(locale, 'practice.close'),
              pick: tr(locale, 'practice.pick'),
              overlayTitle: tr(locale, 'practice.title', { title: c.title }),
            }}
          />
        </div>
        <BoardPreview list={list} title={tr(locale, 'detail.boardTitle')} hiddenLabel={tr(locale, 'detail.boardHidden')} />
      </div>

      <section className="mt-14" aria-labelledby="words">
        <SectionTitle id="words">{tr(locale, 'detail.wordsTitle', { count: list.words.length })}</SectionTitle>
        <ol className="mt-6 grid gap-3 sm:grid-cols-2">
          {list.words.map((w, i) => (
            <li key={w.word} className="flex gap-4 rounded-neo border-3 border-neo-cream/40 bg-neo-navy-light p-4 shadow-hard">
              <span className={`w-7 shrink-0 font-neo-display text-sm font-black ${accent.text}`}>{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p lang={list.lang} className="font-neo-display text-2xl font-black leading-tight text-neo-white">
                  <bdi>{w.word}</bdi>
                </p>
                {w.definition && (
                  <p className="mt-1 text-sm leading-relaxed text-neo-white/75">
                    <bdi>{w.definition}</bdi>
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14" aria-labelledby="how">
        <SectionTitle id="how">{tr(locale, 'detail.howTitle')}</SectionTitle>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <li key={n} className="rounded-neo border-3 border-neo-black bg-neo-cream p-5 text-neo-navy shadow-hard-lg">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border-2 border-neo-black bg-neo-lime font-neo-display font-black shadow-hard-sm">
                {n}
              </span>
              <h3 className="mt-3 font-neo-display text-lg font-black">{tr(locale, `detail.how${n}Title`)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-neo-navy/80">{tr(locale, `detail.how${n}`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <aside className="mt-14 rounded-neo border-4 border-neo-black bg-neo-pink p-6 text-neo-navy shadow-hard-xl sm:p-10">
        <h2 className="font-neo-display text-3xl font-black leading-tight sm:text-4xl">{tr(locale, 'detail.leadTitle')}</h2>
        <p className="mt-3 max-w-2xl text-base font-bold sm:text-lg">{tr(locale, 'detail.leadBody')}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href={accessHref}
            className="rounded-neo border-4 border-neo-cream/40 bg-neo-navy px-6 py-4 text-center font-neo-display font-black uppercase tracking-wider text-neo-lime shadow-hard-lg"
          >
            {tr(locale, 'detail.leadCta')}
          </Link>
          <Link href={`/${locale}/teacher/upgrade`} className="text-center font-bold underline underline-offset-4">
            {tr(locale, 'detail.leadPro')}
          </Link>
        </div>
      </aside>

      <section className="mt-14" aria-labelledby="related">
        <SectionTitle id="related">{tr(locale, 'detail.relatedTitle')}</SectionTitle>
        <CardGrid lists={relatedLists(list)} locale={locale} />
      </section>

      <section className="mt-14" aria-labelledby="browse">
        <SectionTitle id="browse">{tr(locale, 'detail.browseTitle')}</SectionTitle>
        <div className="mt-4 flex flex-wrap gap-3">
          <ChipLink href={`/${pickLocale(langHub.locales, locale)}${langHubPath(list.lang)}`}>
            {tr(locale, `hub.langTitle.${list.lang}`)}
          </ChipLink>
          {gradeHub && (
            <ChipLink href={`/${pickLocale(gradeHub.locales, locale)}${gradeHubPath(gradeHub.lang, gradeHub.grade)}`}>
              {tr(locale, 'hub.gradeTitle', {
                grade: c.grade ?? '',
                language: tr(locale, `lang.${list.lang}`),
                wordsIn: wordsIn(locale, list.lang),
              })}
            </ChipLink>
          )}
          {neighbours.map((h) => (
            <ChipLink key={h.grade} href={`/${pickLocale(h.locales, locale)}${gradeHubPath(h.lang, h.grade)}`}>
              {gradeLabel(locale, h.grade)}
            </ChipLink>
          ))}
          {topicHub && (
            <ChipLink href={`/${pickLocale(topicHub.locales, locale)}${topicHubPath(topicHub.topic)}`}>
              {tr(locale, 'hub.topicTitle', { topic })}
            </ChipLink>
          )}
          <ChipLink href={`/${locale}${LISTS_PATH}`}>{tr(locale, 'nav.lists')}</ChipLink>
        </div>
      </section>

      <GeoFaqList title={tr(locale, 'detail.faqTitle')} items={faqs} />

      <EducationRelatedLinks locale={locale} slug="lists" />
    </ListsFrame>
  );
}
