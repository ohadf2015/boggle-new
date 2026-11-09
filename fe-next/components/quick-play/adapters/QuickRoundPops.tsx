'use client';

/**
 * Quick Play classic's in-round beats, layered over the board:
 * - a short pop for the coach's first word, a golden-tile hit, or a rare word;
 * - the coached round's gentle hint after the player is idle for a while.
 *
 * Pointer-events-none and auto-clearing: nothing here can block a swipe.
 */
import type { RoundPop } from '@/lib/quickPlay/roundPops';

type T = (key: string, params?: Record<string, string>) => string;

const POP_STYLE: Record<RoundPop['kind'], string> = {
  first: 'bg-neo-lime',
  golden: 'bg-neo-yellow',
  rare: 'bg-neo-pink',
};

export function QuickRoundPop({ pop, t }: { pop: RoundPop | null; t: T }) {
  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 top-[18%] z-40 flex justify-center px-4"
      data-testid="quick-round-pop-region"
    >
      {pop && (
        <div
          key={`${pop.kind}-${pop.word}`}
          data-testid={`quick-round-pop-${pop.kind}`}
          className={`animate-neo-pop rounded-2xl border-[3px] border-black px-4 py-2 text-center font-neo-display text-black shadow-hard ${POP_STYLE[pop.kind]}`}
        >
          <p className="text-lg font-bold leading-tight">
            {pop.kind === 'first'
              ? t('quickLoop.pop.firstWord', { word: pop.word.toUpperCase() })
              : pop.kind === 'golden'
                ? t('quickLoop.pop.golden', { points: String(pop.points) })
                : t(pop.tier === 'epic' ? 'quickLoop.pop.epic' : 'quickLoop.pop.rare', { word: pop.word.toUpperCase() })}
          </p>
          {pop.kind === 'first' && (
            <p className="text-xs font-bold opacity-75">{t('quickLoop.pop.clockStarts')}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function QuickCoachHint({ word, t }: { word: string; t: T }) {
  return (
    <div
      role="status"
      data-testid="quick-coach-hint"
      className="pointer-events-none absolute inset-x-0 bottom-[22%] z-40 flex justify-center px-4"
    >
      <p className="animate-neo-pop max-w-xs rounded-2xl border-[3px] border-black bg-neo-cream px-4 py-2 text-center font-neo-display text-sm font-bold text-black shadow-hard">
        {t('quickLoop.coach.hint', { word: word.toUpperCase() })}
      </p>
    </div>
  );
}

export function QuickCoachIntro({ t }: { t: T }) {
  return (
    <div
      data-testid="quick-coach-intro"
      className="pointer-events-none absolute inset-x-0 top-[12%] z-30 flex justify-center px-4"
    >
      <p className="max-w-xs rounded-2xl border-[3px] border-black bg-neo-navy-elevated px-4 py-2 text-center font-neo-display text-sm font-bold text-neo-cream shadow-hard">
        {t('quickLoop.coach.intro')}
      </p>
    </div>
  );
}
