'use client';

import { RotateCcw, Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ResultsNextBar } from '@/components/results/stage/ResultsNextBar';
import { ModeGlyph } from './ModeGlyph';
import { NODE_COLORS } from './modeColors';
import { QUICK_MODES, type QuickMode } from './types';
import type { WheelSelection } from './wheelGeometry';

/**
 * The one primary action, pinned under the scrolling results. "Spin next round"
 * spins: it deals a random round right away. It used to call onNextRound() with
 * no mode, which the hub ignores outside a live round (its guard against stale
 * board quits) — the button did nothing.
 */
export function QuickResultsCtaBar({
  currentMode,
  onNextRound,
  onChallenge,
  shine,
}: {
  /** The mode just played; when given, the next-mode chips pin above the button. */
  currentMode?: QuickMode;
  onNextRound: (mode?: WheelSelection) => void;
  onChallenge: () => void;
  shine: boolean;
}) {
  const { t } = useLanguage();
  return (
    <ResultsNextBar
      testId="quick-results-cta-bar"
      shine={shine}
      clearAdBand
      top={currentMode ? <QuickResultsModeSwitch currentMode={currentMode} onNextRound={onNextRound} compact /> : undefined}
      primary={{ label: t('quickPlay.solo.nextRound'), onClick: () => onNextRound('random'), testId: 'quick-results-next' }}
      secondary={{
        label: t('quickPlay.solo.challengeFriend'),
        title: t('quickPlay.solo.challengeHint'),
        onClick: onChallenge,
        testId: 'quick-results-challenge',
        icon: <Swords className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />,
      }}
    />
  );
}

/**
 * Pick the next round's mode. `compact` is the row pinned in the bottom bar
 * (always on screen, above the tab bar and the ad band); the card form is kept
 * for any caller that lists it in a scrolling column.
 */
export function QuickResultsModeSwitch({
  currentMode,
  onNextRound,
  compact = false,
}: {
  currentMode: QuickMode;
  onNextRound: (mode?: WheelSelection) => void;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className={
        compact
          ? 'flex flex-col gap-1.5'
          : 'flex flex-col gap-2.5 rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 shadow-hard'
      }
      data-testid="quick-next-mode-picker"
    >
      <span className="font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/55">
        {t('quickPlay.solo.pickNextMode', 'Next round')}
      </span>
      <div className="grid grid-cols-4 gap-2">
        {QUICK_MODES.map((mode) => {
          const isCurrent = mode === currentMode;
          return (
            <button
              key={mode}
              type="button"
              data-testid={`quick-next-mode-${mode}`}
              data-current={isCurrent || undefined}
              onClick={() => onNextRound(mode)}
              className={`relative flex ${compact ? 'h-[48px]' : 'h-[60px]'} min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl border-[3px] border-black px-1 font-neo-display text-[11px] font-bold tracking-wide text-black shadow-hard-sm transition-transform active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
                NODE_COLORS[mode].bg
              } ${isCurrent ? '' : 'saturate-[0.85]'}`}
            >
              {isCurrent && (
                <span
                  aria-hidden="true"
                  className="absolute -top-2 end-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-neo-white text-black"
                >
                  <RotateCcw className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
              <ModeGlyph mode={mode} size={20} />
              <span className="max-w-full truncate">{t(`quickPlay.solo.mode.${mode}`)}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
