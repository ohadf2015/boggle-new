'use client';

import { Delete } from 'lucide-react';

interface AlchemyKeyboardProps {
  /** Letters to render (base forms; see lib/wordAlchemy/keyboard.ts). */
  letters: string[];
  /** Locale direction so the key grid flows correctly in Hebrew. */
  dir: 'rtl' | 'ltr';
  /** Tap a letter. */
  onLetter: (letter: string) => void;
  /** Tap backspace. */
  onBackspace: () => void;
  /** Accessible label for the backspace key. */
  backspaceLabel: string;
  /** Disable all keys (e.g. between puzzles). */
  disabled?: boolean;
}

/**
 * On-screen letter keyboard for Word Alchemy. Replaces the free-text input so
 * Hebrew players don't need an IME — every key is a base letter that appends to
 * the guess. Neo-brutalist styling matches the chain tiles.
 */
export default function AlchemyKeyboard({
  letters,
  dir,
  onLetter,
  onBackspace,
  backspaceLabel,
  disabled = false,
}: AlchemyKeyboardProps) {
  return (
    <div
      dir={dir}
      className="flex flex-wrap items-center justify-center gap-1.5 rounded-neo border-3 border-black bg-neo-navy-light p-3 shadow-hard"
    >
      {letters.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onLetter(ch)}
          disabled={disabled}
          aria-label={ch}
          className="inline-flex h-10 w-9 items-center justify-center rounded-neo border-2 border-black bg-neo-cream font-neo-display font-black text-xl uppercase text-neo-navy shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed disabled:opacity-40 disabled:cursor-default sm:h-11 sm:w-10"
        >
          {ch}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        aria-label={backspaceLabel}
        className="inline-flex h-10 w-12 items-center justify-center rounded-neo border-2 border-black bg-neo-pink font-neo-display font-black text-neo-navy shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed disabled:opacity-40 disabled:cursor-default sm:h-11 sm:w-14"
      >
        <Delete className="h-5 w-5 rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />
      </button>
    </div>
  );
}
