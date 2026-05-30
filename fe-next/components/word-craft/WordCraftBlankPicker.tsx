'use client';

import { memo, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { JOKER_GLYPH } from '@/lib/word-craft/blankAssign';

export interface WordCraftBlankPickerProps {
  /** Open only while an unassigned joker is waiting for a letter. */
  open: boolean;
  /** Drawable letters for the active locale (no blank, no sofit). */
  letters: string[];
  onPick: (letter: string) => void;
  /** Recall the joker instead of assigning — backs out of the choice. */
  onCancel: () => void;
  locale?: string;
  labels: {
    title: string;
    hint: string;
    cancel: string;
  };
}

/**
 * Joker letter chooser. A blank tile is a wildcard: the player places it, then
 * names it here. Until a letter is chosen the move can't be submitted (the
 * validator would otherwise build the word with a raw '_'). The grid is
 * locale-aware — Hebrew shows base letters and we surface the sofit glyph for
 * the five final-form letters so the choice reads naturally.
 */
function WordCraftBlankPickerImpl({ open, letters, onPick, onCancel, locale = 'en', labels }: WordCraftBlankPickerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={labels.title}
      data-wc-blank-picker
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4"
      onClick={onCancel}
    >
      <div
        lang={locale}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-neo border-neo-thick border-black bg-neo-navy-light p-4 shadow-hard-lg"
      >
        <div className="mb-1 flex items-center gap-2 text-neo-purple">
          <span aria-hidden className="text-2xl leading-none">{JOKER_GLYPH}</span>
          <h2 className="font-neo-display font-black uppercase tracking-wide text-base text-neo-white">
            {labels.title}
          </h2>
        </div>
        <p className="mb-3 text-xs font-neo-body text-neo-white/70">{labels.hint}</p>
        <div className="grid grid-cols-6 gap-1.5" dir={locale === 'he' ? 'rtl' : 'ltr'}>
          {letters.map((letter) => (
            <button
              key={letter}
              type="button"
              data-wc-blank-letter={letter}
              onClick={() => onPick(letter)}
              className={cn(
                'aspect-square rounded-neo border-2 border-black bg-neo-cream text-neo-navy',
                'font-neo-display font-black text-lg shadow-hard-sm',
                'transition-transform active:scale-90 hover:-translate-y-0.5 hover:bg-neo-lime',
              )}
            >
              {letter}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-3 w-full rounded-neo border-2 border-black bg-neo-red px-3 py-2 font-neo-display font-black uppercase tracking-wide text-sm text-white shadow-hard-sm transition-transform active:scale-95"
        >
          {labels.cancel}
        </button>
      </div>
    </div>
  );
}

export const WordCraftBlankPicker = memo(WordCraftBlankPickerImpl);
