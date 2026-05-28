'use client';

import { memo } from 'react';
import { X, HelpCircle } from 'lucide-react';

export interface WordHuntMPHeaderProps {
  score: number;
  onQuit: () => void;
  t: (key: string) => string;
  onShowHelp?: () => void;
}

export const WordHuntMPHeader = memo<WordHuntMPHeaderProps>(({
  score,
  onQuit,
  t,
  onShowHelp,
}) => {
  return (
    <div className="flex items-center justify-between px-2 py-0.5 [@media(max-height:560px)]:py-0 gap-2">
      {/* Help button or spacer for layout balance */}
      {onShowHelp ? (
        <button
          onClick={onShowHelp}
          className="w-10 h-10 [@media(max-height:560px)]:w-8 [@media(max-height:560px)]:h-8 flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm hover:text-neo-white hover:shadow-hard active:shadow-hard-pressed transition-all"
          aria-label={t('wordHuntRules.quickTipsTitle')}
          data-testid="wh-help-button"
        >
          <HelpCircle size={20} strokeWidth={2.5} />
        </button>
      ) : (
        <div className="w-10" />
      )}

      {/* Score Badge */}
      <div className="flex-1 flex justify-center">
        <div className="bg-neo-navy border-3 border-neo-black rounded-neo px-4 py-1.5 [@media(max-height:560px)]:px-2 [@media(max-height:560px)]:py-0 shadow-hard-sm">
          <span className="text-2xl [@media(max-height:560px)]:text-base font-black font-neo-display text-neo-yellow tabular-nums">
            {score}
          </span>
        </div>
      </div>

      {/* Quit Button */}
      <button
        onClick={onQuit}
        className="w-10 h-10 [@media(max-height:560px)]:w-8 [@media(max-height:560px)]:h-8 flex items-center justify-center rounded-neo border-3 border-neo-black bg-neo-red text-neo-white shadow-hard-sm hover:shadow-hard active:shadow-hard-pressed transition-shadow"
        aria-label={t('common.quit')}
      >
        <X size={20} strokeWidth={3} />
      </button>
    </div>
  );
});

WordHuntMPHeader.displayName = 'WordHuntMPHeader';
