import Link from 'next/link';
import type { ReactNode } from 'react';
import { serializeJsonLd, type Crumb } from '@/lib/seo/wordLists/jsonLd';
import { playableWord, type ListLang, type WordList } from '@/lib/seo/wordLists/model';
import { listPath, pickLocale } from '@/lib/seo/wordLists/paths';
import { displayTitle, gradeLabel, tr } from '@/lib/seo/wordLists/i18n';
import { LandingPage } from '@/components/landing/kit';

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
    <LandingPage locale={locale}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />
      <div className="min-w-0">
        <Breadcrumbs locale={locale} crumbs={crumbs} />
        {children}
      </div>
    </LandingPage>
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
                  <Link href={`/${locale}${c.path}`} className="relative before:absolute before:-inset-x-1 before:-inset-y-3 before:content-[''] underline-offset-4 hover:text-neo-white hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan">
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
    <h2 id={id} className="font-neo-display text-2xl font-bold leading-tight text-balance sm:text-3xl">
      {children}
    </h2>
  );
}

export function ChipLink({ href, children, active = false }: { href: string; children: ReactNode; active?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`inline-flex min-h-11 items-center gap-2 rounded-full border-3 border-neo-black px-4 py-1.5 text-sm font-bold text-neo-black shadow-hard-lg motion-safe:transition-transform motion-safe:hover:-translate-y-0.5 ${
        active ? 'bg-neo-lime' : 'bg-neo-cream'
      } focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-white`}
    >
      {children}
    </Link>
  );
}

/** The first word as board tiles: the list's card art is the game it turns into. */
function WordTiles({ word, lang, className = '' }: { word: string; lang: ListLang; className?: string }) {
  const letters = [...playableWord(word).replace(/\s+/g, '')].slice(0, 6);
  return (
    <div className={`flex gap-1 ${className}`} dir={lang === 'he' ? 'rtl' : 'ltr'} aria-hidden>
      {letters.map((ch, i) => (
        <span
          key={`${ch}-${i}`}
          className={`inline-flex h-8 w-8 items-center justify-center rounded-neo border-2 border-neo-black bg-neo-white font-neo-display text-base font-black uppercase text-neo-navy shadow-hard-sm ${
            i % 2 ? 'rotate-2' : '-rotate-2'
          }`}
        >
          {ch}
        </span>
      ))}
    </div>
  );
}

/** `compact` drops the tile art on phones, where a long grid of cards would run screens deep. */
export function ListCard({ list, locale, compact = false }: { list: WordList; locale: string; compact?: boolean }) {
  const target = pickLocale(list.locales, locale);
  const { title } = displayTitle(list, locale);
  const accent = LANG_ACCENT[list.lang];
  return (
    <Link
      data-list-card
      href={`/${target}${listPath(list)}`}
      className="group flex h-full flex-col rounded-neo-lg border-3 border-neo-black bg-neo-cream p-4 text-neo-black shadow-hard-xl motion-safe:transition-transform motion-safe:hover:-translate-y-1 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-white"
    >
      <WordTiles word={list.words[0].word} lang={list.lang} className={compact ? 'max-sm:hidden' : ''} />
      <h3 className={`font-neo-display text-lg font-bold leading-tight ${compact ? 'sm:mt-4' : 'mt-4'}`} dir="auto">
        {title}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm text-neo-navy/70" dir="auto" lang={list.lang}>
        {list.words
          .slice(0, 5)
          .map((w) => w.word)
          .join(' · ')}
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-xs font-black uppercase tracking-widest">
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

/** `rail` scrolls sideways on phones, for short previews that would otherwise stack screens deep. */
export function CardGrid({ lists, locale, rail = false }: { lists: WordList[]; locale: string; rail?: boolean }) {
  return (
    <ul
      className={
        rail
          ? 'relative -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3'
          : 'mt-5 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3'
      }
    >
      {lists.map((l) => (
        <li key={l.id} className={rail ? 'w-[78%] shrink-0 snap-start sm:w-auto' : undefined}>
          <ListCard list={l} locale={locale} compact={!rail} />
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
      <h1 className="mt-4 font-neo-display text-[2rem] font-bold leading-[1.1] text-balance sm:text-5xl" dir="auto">
        <span className={`inline rounded-neo px-2 text-neo-black [box-decoration-break:clone] ${accent}`}>
          {title}
        </span>
      </h1>
      {subtitle && (
        <p className="mt-3 font-neo-display text-xl font-bold text-neo-white/70">
          <bdi>{subtitle}</bdi>
        </p>
      )}
      <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-neo-white/85 sm:text-lg">{intro}</p>
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
