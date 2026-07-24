'use client';

import { CheckCheck, Eye, RotateCcw, Lightbulb } from 'lucide-react';
import type { Difficulty } from '@/lib/crossword/types';

interface ToolbarProps {
  onCheck: () => void;
  onRevealLetter: () => void;
  onRevealWord: () => void;
  onReset: () => void;
  autoCheck: boolean;
  onToggleAutoCheck: () => void;
  t: (k: string, p?: any) => string;
}

export function CrosswordToolbar({
  onCheck, onRevealLetter, onRevealWord, onReset,
  autoCheck, onToggleAutoCheck, t,
}: ToolbarProps) {
  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onCheck}
        className="flex items-center gap-1.5 font-neo-display font-bold text-sm bg-neo-lime text-neo-navy border-neo border-black rounded-neo shadow-hard px-5 py-2.5 active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <CheckCheck size={16} />
        {t('crossword.check')}
      </button>
      <button
        type="button"
        onClick={onRevealLetter}
        className="flex items-center gap-1.5 font-neo-body font-semibold text-sm bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard px-3 py-2 active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <Lightbulb size={14} />
        {t('crossword.revealLetter')}
      </button>
      <button
        type="button"
        onClick={onRevealWord}
        className="flex items-center gap-1.5 font-neo-body font-semibold text-sm bg-neo-navy-light text-neo-white border-neo border-black rounded-neo shadow-hard px-3 py-2 active:translate-y-[1px] active:shadow-hard-pressed"
      >
        <Eye size={14} />
        {t('crossword.revealWord')}
      </button>
      <div className="relative group">
        <button
          type="button"
          className="flex items-center gap-1 font-neo-body text-xs bg-neo-navy-light/60 text-neo-white/60 border-neo border-black rounded-neo shadow-hard px-2 py-2 active:translate-y-[1px] active:shadow-hard-pressed"
        >
          <RotateCcw size={13} />
        </button>
        <div className="absolute bottom-full mb-1 end-0 hidden group-hover:block group-focus-within:block z-30">
          <div className="bg-neo-navy border-neo border-black rounded-neo shadow-hard-lg py-1 min-w-[8rem]">
            <button
              type="button"
              onClick={onReset}
              className="w-full text-start px-3 py-1.5 font-neo-body text-xs text-neo-white/70 hover:bg-neo-navy-light transition-colors"
            >
              {t('crossword.restart')}
            </button>
            <button
              type="button"
              onClick={onToggleAutoCheck}
              className="w-full text-start px-3 py-1.5 font-neo-body text-xs text-neo-white/70 hover:bg-neo-navy-light transition-colors"
            >
              {autoCheck ? '◆' : '◇'} {t('crossword.autoCheck')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}