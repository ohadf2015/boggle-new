'use client';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * EducationModeMock — a coded, fully-localizable mockup of the live Classroom
 * Game, used on the education landing hero to *show* the product instead of
 * just describing it. No binary image assets: a neo-brutalist "browser window"
 * frame wraps a faux classroom screen (join code, live letter board, and a
 * real-time class leaderboard).
 *
 * Decorative — marked role="img" with a localized label so screen readers get
 * one concise description instead of reading every faux tile. Float/glow is
 * gated behind `motion-safe:` so it fully respects prefers-reduced-motion.
 */

// 4x4 board spelling-friendly letters. Static + decorative (not translated).
const BOARD = ['C', 'L', 'A', 'S', 'S', 'R', 'O', 'O', 'M', 'W', 'O', 'R', 'D', 'P', 'L', 'Y'];

// Highlighted "word path" tiles (indices) to suggest an in-progress word.
const PATH = new Set([0, 1, 2, 3]); // C-L-A-S(S)

const LEADERS = [
  { nameKey: 's1', score: 1280, medal: 'bg-neo-yellow', text: 'text-neo-navy' },
  { nameKey: 's2', score: 1140, medal: 'bg-neo-cyan', text: 'text-neo-navy' },
  { nameKey: 's3', score: 980, medal: 'bg-neo-pink', text: 'text-neo-navy' },
] as const;

export function EducationModeMock() {
  const { t } = useLanguage();

  return (
    <figure
      role="img"
      aria-label={t('education.landing.mock.caption')}
      className="relative mx-auto w-full max-w-md motion-safe:animate-float"
    >
      {/* Browser-window frame */}
      <div className="overflow-hidden rounded-neo border-neo-thick border-neo-navy bg-neo-navy shadow-hard-xl">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b-3 border-neo-navy bg-neo-cream px-3 py-2">
          <span className="h-3 w-3 rounded-full border-2 border-neo-navy bg-neo-pink" aria-hidden />
          <span className="h-3 w-3 rounded-full border-2 border-neo-navy bg-neo-yellow" aria-hidden />
          <span className="h-3 w-3 rounded-full border-2 border-neo-navy bg-neo-lime" aria-hidden />
          <span className="ml-2 truncate rounded-neo-sm bg-neo-white px-2 py-0.5 font-mono text-[11px] text-neo-navy/70">
            lexiclash.live/classroom
          </span>
        </div>

        {/* Screen */}
        <div className="bg-neo-navy p-4">
          {/* Status row: tab + LIVE + players */}
          <div className="flex items-center justify-between">
            <span className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-white">
              {t('education.landing.mock.tab')}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-neo-pill border-2 border-neo-navy bg-neo-red px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">
              <span className="h-1.5 w-1.5 rounded-full bg-neo-white motion-safe:animate-pulse-subtle" aria-hidden />
              {t('education.landing.mock.live')}
            </span>
          </div>

          {/* Join code + players */}
          <div className="mt-3 flex items-center justify-between gap-3 rounded-neo border-2 border-neo-lime bg-neo-navy-light px-3 py-2">
            <div className="flex flex-col">
              <span className="font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-lime">
                {t('education.landing.mock.join_label')}
              </span>
              <span
                data-testid="mock-join-code"
                className="font-mono text-2xl font-black tracking-[0.3em] text-neo-white"
              >
                4821
              </span>
            </div>
            <span className="shrink-0 text-right font-neo-display text-xs font-bold text-neo-cyan">
              {t('education.landing.mock.players')}
            </span>
          </div>

          {/* Letter board */}
          <div
            data-testid="mock-board"
            className="mt-4 grid grid-cols-4 gap-1.5"
            aria-hidden
          >
            {BOARD.map((letter, i) => (
              <span
                key={i}
                data-mock-tile
                className={`flex aspect-square items-center justify-center rounded-neo-sm border-2 border-neo-navy font-neo-display text-base font-black ${
                  PATH.has(i)
                    ? 'bg-neo-lime text-neo-navy shadow-hard-sm'
                    : 'bg-neo-cream text-neo-navy/80'
                }`}
              >
                {letter}
              </span>
            ))}
          </div>
          <p className="mt-2 text-center text-[11px] text-neo-white/60">
            {t('education.landing.mock.board_caption')}
          </p>

          {/* Live leaderboard */}
          <div className="mt-4 rounded-neo border-2 border-neo-navy bg-neo-cream p-3">
            <h4 className="font-neo-display text-[11px] font-black uppercase tracking-widest text-neo-navy/70">
              {t('education.landing.mock.leaderboard_title')}
            </h4>
            <ul className="mt-2 space-y-1.5">
              {LEADERS.map((p, i) => (
                <li
                  key={p.nameKey}
                  className="flex items-center gap-2 rounded-neo-sm bg-neo-white px-2 py-1.5"
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-neo-navy font-neo-display text-[10px] font-black ${p.medal} ${p.text}`}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate text-xs font-bold text-neo-navy">
                    {t(`education.landing.mock.${p.nameKey}`)}
                  </span>
                  <span className="font-mono text-xs font-black text-neo-navy">
                    {p.score.toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <figcaption className="sr-only">{t('education.landing.mock.caption')}</figcaption>
    </figure>
  );
}

export default EducationModeMock;
