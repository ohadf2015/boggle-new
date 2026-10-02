import Link from 'next/link';
import type { ReactNode } from 'react';
import { serializeJsonLd, type Crumb } from '@/lib/seo/wordLists/jsonLd';
import { playableWord, type ListLang, type WordList } from '@/lib/seo/wordLists/model';
import { listPath, pickLocale } from '@/lib/seo/wordLists/paths';
import { displayTitle, gradeLabel, tr } from '@/lib/seo/wordLists/i18n';

export const LANG_ACCENT: Record<ListLang, { fill: string; text: string }> = {
  en: { fill: 'bg-neo-lime', text: 'text-neo-lime' },
  he: { fill: 'bg-neo-cyan', text: 'text-neo-cyan' },
  es: { fill: 'bg-neo-pink', text: 'text-neo-pink' },
  sv: { fill: 'bg-neo-purple', text: 'text-neo-purple' },
  ja: { fill: 'bg-neo-purple', text: 'text-neo-purple' },
};

export function ListsFrame({
  locale,
  crumbs,
  graph,
  children,
}: {
  locale: string;
  crumbs: Crumb[];
  graph: unknown;
  children: ReactNode;
}) {
  return (
    <main className="relative min-h-screen overflow-x-hidden bg-neo-navy text-neo-white texture-halftone">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />
      <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        {children}
      </div>
    </main>
  );
}

function Breadcrumbs({ locale, crumbs }: { locale: string; crumbs: Crumb[] }) {
  return (
    <nav
      aria-label={tr(locale, 'nav.breadcrumb')}
      className="mb-6 text-xs font-bold uppercase tracking-widest text-neo-white/60 sm:text-sm"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={c.path} className="flex items-center gap-2">
              {last ? (
                <span aria-current="page" className="text-neo-white" dir="auto">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={`/${locale}${c.path}`} className="underline-offset-4 hover:text-neo-white hover:underline">
                    {c.name}
                  </Link>
                  <span aria-hidden className="text-neo-white/30">
                    /
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SectionTitle({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2 id={id} className="font-neo-display text-2xl font-black uppercase leading-tight tracking-wide sm:text-3xl">
      {children}
    </h2>
  );
}

export function ChipLink({ href, children, active = false }: { href: string; children: ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-neo border-3 px-4 py-2 text-sm font-black shadow-hard transition-transform duration-150 hover:-translate-y-0.5 ${
        active ? 'border-neo-black bg-neo-white text-neo-navy' : 'border-neo-cream/40 bg-neo-navy-light text-neo-white'
      }`}
    >
      {children}
    </Link>
  );
}

/** The first word as board tiles: the list's card art is the game it turns into. */
function WordTiles({ word, lang }: { word: string; lang: ListLang }) {
  const letters = [...playableWord(word).replace(/\s+/g, '')].slice(0, 6);
  return (
    <div className="flex gap-1" dir={lang === 'he' ? 'rtl' : 'ltr'} aria-hidden>
      {letters.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-md border-2 border-neo-black bg-neo-white font-neo-display text-base font-black uppercase text-neo-navy shadow-hard-sm ${
            i % 2 ? 'rotate-2' : '-rotate-2'
          }`}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

export function ListCard({ list, locale }: { list: WordList; locale: string }) {
  const target = pickLocale(list.locales, locale);
  const { title } = displayTitle(list, locale);
  const accent = LANG_ACCENT[list.lang];
  return (
    <Link
      data-list-card
      href={`/${target}${listPath(list)}`}
      className="group flex h-full flex-col rounded-neo border-3 border-neo-black bg-neo-cream p-4 text-neo-navy shadow-hard-lg transition-transform duration-150 hover:-translate-y-1 focus-visible:-translate-y-1 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-white"
    >
      <WordTiles word={list.words[0].word} lang={list.lang} />
      <h3 className="mt-4 font-neo-display text-lg font-black leading-tight" dir="auto">
        {title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-neo-navy/70" dir="auto" lang={list.lang}>
        {list.words
          .slice(0, 5)
          .map((w) => w.word)
          .join(' · ')}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-[11px] font-black uppercase tracking-widest">
        <span className={`rounded border-2 border-neo-black px-2 py-0.5 ${accent.fill} text-neo-navy`}>
          {tr(locale, `lang.${list.lang}`)}
        </span>
        {list.grade && (
          <span className="rounded border-2 border-neo-black bg-neo-white px-2 py-0.5">{gradeLabel(locale, list.grade)}</span>
        )}
        <span className="text-neo-navy/60">{tr(locale, 'count.words', { count: list.words.length })}</span>
      </div>
    </Link>
  );
}

export function CardGrid({ lists, locale }: { lists: WordList[]; locale: string }) {
  return (
    <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((l) => (
        <li key={l.id}>
          <ListCard list={l} locale={locale} />
        </li>
      ))}
    </ul>
  );
}

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  intro,
  accent = 'bg-neo-lime',
}: {
  eyebrow: ReactNode;
  title: string;
  subtitle?: string;
  intro: string;
  accent?: string;
}) {
  return (
    <header className="max-w-4xl">
      <div className="flex flex-wrap items-center gap-2">{eyebrow}</div>
      {/* No entrance tween: the H1 is the LCP element (pitfalls Class 5). */}
      <h1
        className="mt-5 font-neo-display text-[clamp(2.25rem,8vw,4.5rem)] font-black leading-[0.95] tracking-[-0.02em]"
        dir="auto"
      >
        <span className={`inline decoration-clone ${accent} px-2 text-neo-navy shadow-hard-lg [box-decoration-break:clone]`}>
          {title}
        </span>
      </h1>
      {subtitle && (
        <p className="mt-4 font-neo-display text-xl font-black text-neo-white/70">
          <bdi>{subtitle}</bdi>
        </p>
      )}
      <p className="mt-6 max-w-[65ch] text-lg leading-relaxed text-neo-white/85">{intro}</p>
    </header>
  );
}

export function Tag({ children, tone = 'bg-neo-white text-neo-navy' }: { children: ReactNode; tone?: string }) {
  return (
    <span
      className={`inline-block rounded-neo border-3 ${tone.includes('border-') ? '' : 'border-neo-black'} px-3 py-1 font-neo-display text-xs font-black uppercase tracking-widest shadow-hard ${tone}`}
    >
      {children}
    </span>
  );
}
