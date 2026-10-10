'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ModeGlyph } from './ModeGlyph';
import { NODE_COLORS } from './modeColors';
import { QUICK_MODES, type QuickMode } from './types';

interface QuickResultsNextActionsProps {
  currentMode: QuickMode;
  /** A mode means "start that one now"; undefined means the default next round. */
  onNextRound: (mode?: QuickMode) => void;
  onChallenge: () => void;
  onExit?: () => void;
}

/**
 * The one primary action (filled lime "next round") plus the mode picker as
 * outlined chips, so modes never compete with the primary button for attention.
 */
export function QuickResultsNextActions({ currentMode, onNextRound, onChallenge, onExit }: QuickResultsNextActionsProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col gap-1.5">
  <div className="flex flex-col gap-1.5" data-testid="quick-next-mode-picker">
    <span className="text-center font-neo-display text-[10px] uppercase tracking-[0.18em] text-neo-white/45">
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

  <button
    type="button"
    data-testid="quick-results-next"
    onClick={() => onNextRound()}
    className="h-[52px] rounded-2xl border-4 border-black bg-neo-lime font-neo-display text-lg font-bold tracking-[2px] text-black shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed"
  >
    {t('quickPlay.solo.nextRound')}
  </button>
  <button
    type="button"
    data-testid="quick-results-challenge"
    onClick={onChallenge}
    className="flex h-[44px] items-center justify-center rounded-2xl font-neo-display text-sm font-semibold text-neo-cosy"
  >
    {t('quickPlay.solo.challengeFriend')}
  </button>
  <p className="text-center text-[10px] text-neo-white/45">{t('quickPlay.solo.challengeHint')}</p>
  {onExit && (
    <button
      type="button"
      data-testid="quick-results-exit"
      onClick={onExit}
      className="flex h-[44px] items-center justify-center rounded-2xl font-neo-display text-sm font-semibold text-neo-white/80"
    >
      {t('common.back')}
    </button>
  )}
    </div>
  );
}
