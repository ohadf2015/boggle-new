'use client';

import { Swords } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { ModeGlyph } from './ModeGlyph';
import { NODE_COLORS } from './modeColors';
import { QUICK_MODES, type QuickMode } from './types';

/** The one primary action, pinned under the scrolling results. */
export function QuickResultsCtaBar({
  onNextRound,
  onChallenge,
  shine,
}: {
  onNextRound: (mode?: QuickMode) => void;
  onChallenge: () => void;
  shine: boolean;
}) {
  const { t } = useLanguage();
  return (
    <div
      className="relative z-20 mb-[var(--bottom-nav-height,0px)] shrink-0 bg-neo-navy px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5"
      data-testid="quick-results-cta-bar"
    >
      <div className="mx-auto flex w-full max-w-md items-stretch gap-2.5">
        <button
          type="button"
          data-testid="quick-results-challenge"
          onClick={onChallenge}
          aria-label={t('quickPlay.solo.challengeFriend')}
          title={t('quickPlay.solo.challengeHint')}
          className="flex h-[56px] min-h-[44px] w-[56px] shrink-0 items-center justify-center rounded-2xl border-[3px] border-neo-white/25 text-neo-cream active:translate-y-0.5"
        >
          <Swords className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          data-testid="quick-results-next"
          onClick={() => onNextRound()}
          className="relative h-[56px] flex-1 overflow-hidden rounded-2xl border-[3px] border-black bg-neo-lime font-neo-display text-lg font-bold uppercase tracking-[0.12em] text-black shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
        >
          {shine && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 w-1/4 bg-white/45 animate-[qp-shine_4s_ease-in-out_2.3s_infinite_both]"
            />
          )}
          <span className="relative">{t('quickPlay.solo.nextRound')}</span>
        </button>
      </div>
    </div>
  );
}

/** Pick a different mode for the next round — secondary, below the hero. */
export function QuickResultsModeSwitch({
  currentMode,
  onNextRound,
}: {
  currentMode: QuickMode;
  onNextRound: (mode?: QuickMode) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-1.5" data-testid="quick-next-mode-picker">
      <span className="text-center font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/50">
        {t('quickPlay.solo.pickNextMode', 'Next round')}
      </span>
      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            data-testid={`quick-next-mode-${mode}`}
            onClick={() => onNextRound(mode)}
            className={`flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-xl border-2 font-neo-display text-[11px] font-bold tracking-wide text-neo-cream active:translate-y-0.5 ${
              mode === currentMode ? 'border-neo-cream bg-neo-white/10' : 'border-neo-white/20 bg-transparent'
            }`}
          >
            <span className={NODE_COLORS[mode].text}>
              <ModeGlyph mode={mode} size={18} />
            </span>
            {t(`quickPlay.solo.mode.${mode}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
