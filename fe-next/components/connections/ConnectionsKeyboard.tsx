'use client';

import { Delete, CornerDownLeft } from 'lucide-react';

interface ConnectionsKeyboardProps {
  /** Keyboard rows in physical-layout order (see lib/connections/keyboard.ts). */
  rows: readonly string[][];
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
  'inline-flex items-center justify-center rounded-neo border-2 border-black font-neo-display font-black select-none transition-all duration-75 shadow-hard-sm active:translate-y-[2px] active:shadow-none disabled:opacity-40 disabled:cursor-default';

/**
 * On-screen keyboard for Word Bridge, laid out in the 3 physical-keyboard rows
 * players already know (QWERTY / standard Hebrew / ЙЦУКЕН) — Wordle-family
 * ergonomics. Hebrew players never need an IME: every key is a base letter and
 * sofit glyphs are rendered at word-end elsewhere. Submit + backspace flank the
 * bottom row. Neo-brutalist keys with a hard press-down feel.
 */
export default function ConnectionsKeyboard({
  rows,
  dir,
  onLetter,
  onBackspace,
  onSubmit,
  backspaceLabel,
  submitLabel,
  canSubmit = false,
  disabled = false,
}: ConnectionsKeyboardProps) {
  const lastRow = rows.length - 1;
  return (
    <div
      dir={dir}
      className="flex w-full flex-col gap-1.5 rounded-neo border-neo-thick border-black bg-neo-navy-light p-1.5 shadow-hard"
    >
      {rows.map((row, rowIdx) => (
        <div key={`row-${rowIdx}`} className="flex w-full items-stretch justify-center gap-1 sm:gap-1.5">
          {rowIdx === lastRow && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !canSubmit}
              aria-label={submitLabel}
              title={submitLabel}
              className={`${KEY_BASE} h-12 flex-[1.5] basis-10 min-w-[2.4rem] bg-neo-cyan text-neo-navy`}
            >
              <CornerDownLeft className="h-5 w-5 rtl:-scale-x-100" strokeWidth={2.75} aria-hidden="true" />
            </button>
          )}
          {row.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onLetter(ch)}
              disabled={disabled}
              aria-label={ch}
              className={`${KEY_BASE} h-12 min-w-0 flex-1 basis-7 bg-neo-cream text-xl uppercase text-neo-navy hover:bg-neo-white`}
            >
              {ch}
            </button>
          ))}
          {rowIdx === lastRow && (
            <button
              type="button"
              onClick={onBackspace}
              disabled={disabled}
              aria-label={backspaceLabel}
              title={backspaceLabel}
              className={`${KEY_BASE} h-12 flex-[1.5] basis-10 min-w-[2.4rem] bg-neo-pink text-neo-navy`}
            >
              <Delete className="h-5 w-5 rtl:rotate-180" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
