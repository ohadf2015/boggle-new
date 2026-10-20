'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const BOARD_SELECTOR = '[data-testid=solo-slot-board]';

/**
 * One line instead of the 4-step lesson. A tap on the board dismisses it —
 * the board is the game, not a gate.
 */
export function SearchInlineHint({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useLanguage();

  useEffect(() => {
    const board = document.querySelector(BOARD_SELECTOR);
    if (!board) return;
    const dismiss = () => onDismiss();
    board.addEventListener('pointerdown', dismiss);
    return () => board.removeEventListener('pointerdown', dismiss);
  }, [onDismiss]);

  return (
    <div
      role="status"
      data-testid="search-inline-hint"
      className="mx-auto flex w-full max-w-md items-center gap-2 rounded-neo border-[2px] border-neo-black bg-neo-cream px-3 py-2 text-neo-black shadow-hard-sm"
    >
      <p className="min-w-0 flex-1 font-neo-body text-sm leading-snug">{t('firstLesson.inlineHint')}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 font-neo-display text-xs font-black uppercase underline underline-offset-2"
      >
        {t('firstLesson.inlineDismiss')}
      </button>
    </div>
  );
}

export default SearchInlineHint;
