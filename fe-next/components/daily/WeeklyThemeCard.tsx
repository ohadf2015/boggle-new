'use client';

/**
 * This week's themed board: one seeded classic board per ISO week, the same
 * for everyone, replayable all week. One tap into Quick Play.
 *
 * The full card is an event poster, not a settings row: the theme's own colour,
 * a mini board that spells the theme with a shining gold tile, a countdown to
 * the end of the week and a big play button. The compact variant (home page)
 * stays a one-line chip.
 *
 * Mount-gated: the week is read from the clock, so server HTML (and a page
 * cached across a Monday) can never disagree with the client.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play, Sparkles, Timer } from 'lucide-react';
import posthog from '@/lib/analytics/lazyPosthog';
import { isoWeekKey, weeklyThemeFor, type WeeklyThemeId } from '@/shared/utils/weeklyTheme';

interface WeeklyThemeCardProps {
  lang: string;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Where it sits, for analytics. */
  source: 'home' | 'daily_hub';
  compact?: boolean;
}

/* Literal class strings only: Tailwind emits what it can read in source. */
const THEME_STYLE: Record<WeeklyThemeId, { bg: string; text: string; tile: string }> = {
  goldRush: { bg: 'bg-neo-yellow', text: 'text-neo-yellow', tile: 'bg-neo-yellow' },
  vowelParty: { bg: 'bg-neo-pink', text: 'text-neo-pink', tile: 'bg-neo-pink' },
  sStorm: { bg: 'bg-neo-cyan', text: 'text-neo-cyan', tile: 'bg-neo-cyan' },
  bigLetters: { bg: 'bg-neo-purple', text: 'text-neo-purple', tile: 'bg-neo-purple' },
};

/** Whole days left in this ISO week (UTC), counting today: Sunday → 1. */
export function daysLeftInWeek(now: Date = new Date()): number {
  const day = now.getUTCDay() || 7; // Mon=1 … Sun=7
  return 8 - day;
}

/** Eight letters for the mini board, spelled from the theme name. */
export function boardLetters(name: string): string[] {
  const letters = Array.from(name.replace(/[^\p{L}]/gu, '').toUpperCase());
  return Array.from({ length: 8 }, (_, i) => letters[i] ?? '?');
}

function MiniBoard({ name, tileClass }: { name: string; tileClass: string }) {
  const letters = boardLetters(name);
  const cells = [...letters.slice(0, 4), null, ...letters.slice(4)];
  return (
    <div
      aria-hidden="true"
      className="grid shrink-0 grid-cols-3 gap-1 rounded-xl border-[3px] border-black bg-neo-navy p-1.5 shadow-hard-sm -rotate-3"
    >
      {cells.map((ch, i) =>
        ch === null ? (
          <span
            key={i}
            data-testid="weekly-gold-tile"
            className="relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-md border-2 border-black bg-neo-yellow text-black shadow-[0_0_12px_rgba(255,214,10,0.85)] motion-safe:animate-[qp-avatar-bob_1.6s_ease-in-out_infinite]"
          >
            <Sparkles className="h-4 w-4" strokeWidth={3} />
            <span className="pointer-events-none absolute inset-y-0 -left-2 w-2 rotate-12 bg-white/70 motion-safe:animate-[qp-shine_2.4s_ease-in-out_infinite]" />
          </span>
        ) : (
          <span
            key={i}
            className={`flex h-7 w-7 items-center justify-center rounded-md border-2 border-black font-neo-display text-sm font-black text-black ${
              i % 3 === 0 ? tileClass : 'bg-neo-cream'
            }`}
          >
            {ch}
          </span>
        ),
      )}
    </div>
  );
}

export function WeeklyThemeCard({ lang, t, source, compact = false }: WeeklyThemeCardProps) {
  const [theme, setTheme] = useState<WeeklyThemeId | null>(null);
  const [daysLeft, setDaysLeft] = useState(7);
  useEffect(() => {
    setTheme(weeklyThemeFor(isoWeekKey(), lang).id);
    setDaysLeft(daysLeftInWeek());
  }, [lang]);
  if (!theme) return null;

  const name = t(`quickLoop.weekly.theme.${theme}`);
  const style = THEME_STYLE[theme];
  const href = `/${lang}/quick-play?weekly=1`;
  const onClick = () => posthog.capture('weekly_theme_board_click', { theme, source });

  if (compact) {
    return (
      <Link
        href={href}
        data-testid="weekly-theme-card"
        data-theme={theme}
        onClick={onClick}
        className="flex w-full items-center gap-3 rounded-2xl border-[3px] border-black bg-neo-cyan px-3 py-2 text-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
      >
        <Sparkles className="h-5 w-5 shrink-0" strokeWidth={2.75} aria-hidden="true" />
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-neo-display text-[11px] font-bold uppercase tracking-wider opacity-70">
            {t('quickLoop.weekly.kicker')}
          </span>
          <span className="truncate font-neo-display text-sm font-bold">{name}</span>
        </span>
        <span className="ms-auto shrink-0 rounded-xl border-2 border-black bg-black px-2.5 py-1 font-neo-display text-xs font-bold text-neo-cyan">
          {t('quickLoop.weekly.play')}
        </span>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      data-testid="weekly-theme-card"
      data-theme={theme}
      onClick={onClick}
      className="group relative block w-full overflow-hidden rounded-2xl border-[3px] border-black bg-neo-navy-light text-neo-white shadow-hard transition-transform hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
    >
      {/* Theme-coloured burst behind the board. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute -end-10 -top-10 h-40 w-40 rounded-full opacity-25 blur-2xl ${style.bg}`}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1.2px)', backgroundSize: '10px 10px' }}
      />

      <span className="relative flex items-start justify-between gap-2 px-4 pt-3">
        <span className={`-rotate-2 rounded-md border-2 border-black px-2 py-0.5 font-neo-display text-[11px] font-black uppercase tracking-wider text-black shadow-hard-xs ${style.bg}`}>
          {t('quickLoop.weekly.kicker')}
        </span>
        <span
          data-testid="weekly-countdown"
          className="flex items-center gap-1 rounded-full border-2 border-black bg-black px-2 py-0.5 text-[11px] font-black text-neo-white"
        >
          <Timer className={`h-3.5 w-3.5 ${style.text}`} aria-hidden="true" />
          {daysLeft <= 1 ? t('quickLoop.weekly.lastDay') : t('quickLoop.weekly.endsIn', { days: daysLeft })}
        </span>
      </span>

      <span className="relative flex items-center gap-4 px-4 pb-4 pt-3">
        <MiniBoard name={name} tileClass={style.tile} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className={`font-neo-display text-[26px] font-black leading-none [text-shadow:2px_2px_0_black] ${style.text}`}>
            {name}
          </span>
          <span className="mt-1.5 text-[13px] font-semibold leading-snug text-neo-white/80">
            {t(`quickLoop.weekly.line.${theme}`)}
          </span>
        </span>
      </span>

      <span className="relative mx-4 mb-4 flex h-12 items-center justify-center gap-2 overflow-hidden rounded-xl border-[3px] border-black bg-neo-lime font-neo-display text-lg font-black tracking-wide text-black shadow-hard-sm">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/45 motion-safe:animate-[qp-shine_4s_ease-in-out_1s_infinite_both]"
        />
        <Play className="relative h-5 w-5 fill-current" aria-hidden="true" />
        <span className="relative">{t('quickLoop.weekly.play')}</span>
      </span>
    </Link>
  );
}
