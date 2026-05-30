'use client';

import { Delete, CornerDownLeft } from 'lucide-react';

interface ConnectionsKeyboardProps {
  /** Letters to render (base forms; see lib/connections/keyboard.ts). */
  letters: string[];
  /** Locale direction so the key grid flows correctly in Hebrew. */
  dir: 'rtl' | 'ltr';
  /** Tap a letter. */
  onLetter: (letter: string) => void;
  /** Tap backspace. */
  onBackspace: () => void;
  /** Tap submit / enter. */
  onSubmit: () => void;
  /** Accessible label for the backspace key. */
  backspaceLabel: string;
  /** Visible + accessible label for the submit key. */
  submitLabel: string;
  /** Whether there is anything to submit (gates the submit key). */
  canSubmit?: boolean;
  /** Disable every key (e.g. between puzzles / resolved / out of lives). */
  disabled?: boolean;
}

const KEY_BASE =
  'inline-flex items-center justify-center rounded-neo border-2 border-black font-neo-display font-black shadow-hard-sm transition-transform hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed disabled:opacity-40 disabled:cursor-default disabled:hover:translate-y-0';

/**
 * On-screen letter keyboard for Word Bridge. Replaces the free-text input so
 * Hebrew players never need an IME — every key is a base letter that appends to
 * the guess; sofit glyphs are rendered at word-end elsewhere. Backspace + submit
 * keys make the keyboard a self-contained input surface. Neo-brutalist styling.
 */
export default function ConnectionsKeyboard({
  letters,
  dir,
  onLetter,
  onBackspace,
  onSubmit,
  backspaceLabel,
  submitLabel,
  canSubmit = false,
  disabled = false,
}: ConnectionsKeyboardProps) {
  return (
    <div
      dir={dir}
      className="flex flex-wrap items-center justify-center gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy-light p-3 shadow-hard"
    >
      {letters.map((ch) => (
        <button
          key={ch}
          type="button"
          onClick={() => onLetter(ch)}
          disabled={disabled}
          aria-label={ch}
          className={`${KEY_BASE} h-10 w-9 bg-neo-cream text-xl uppercase text-neo-navy sm:h-11 sm:w-10`}
        >
          {ch}
        </button>
      ))}
      <button
        type="button"
        onClick={onBackspace}
        disabled={disabled}
        aria-label={backspaceLabel}
        className={`${KEY_BASE} h-10 w-12 bg-neo-pink text-neo-navy sm:h-11 sm:w-14`}
      >
        <Delete className="h-5 w-5 rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={onSubmit}
        disabled={disabled || !canSubmit}
        aria-label={submitLabel}
        className={`${KEY_BASE} h-10 gap-1.5 px-4 bg-neo-cyan text-sm uppercase text-neo-navy sm:h-11`}
      >
        <CornerDownLeft className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        {submitLabel}
      </button>
    </div>
  );
}
