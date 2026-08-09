'use client';

import type { CSSProperties } from 'react';
import { m } from 'framer-motion';
import { Delete, CornerDownLeft } from 'lucide-react';
import { letterColumnCount } from '@/lib/connections/keyboard';

interface ConnectionsKeyboardProps {
  /** Keyboard rows in physical-layout order (see lib/connections/keyboard.ts). */
  rows: readonly string[][];
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
  'inline-flex items-center justify-center rounded-neo border-2 border-black font-neo-display font-black select-none transition-all duration-75 shadow-hard-sm active:translate-y-[2px] active:shadow-none active:scale-95 disabled:opacity-40 disabled:cursor-default';

/** Shared key sizing — taller keys, no basis floor, so no key squashes. */
const KEY_SIZE = 'h-12 sm:h-14 min-w-0';

/**
 * One letter-key width for the WHOLE keyboard. Every letter key gets this
 * flex-basis with grow disabled, so a 7-key row renders keys identical to a
 * 10-key row (shorter rows just center) instead of each row stretching to its
 * own width.
 *
 * The column count comes from letterColumnCount, which reserves room for the
 * submit/backspace keys flanking the last row — dividing by the longest row
 * alone squashed the bottom row on layouts where it is already the longest
 * (Hebrew). See lib/connections/keyboard.ts.
 */
function letterKeyStyle(columns: number): CSSProperties {
  return { flexBasis: `calc(${(100 / columns).toFixed(4)}% - 0.375rem)`, flexGrow: 0, flexShrink: 1 };
}

/**
 * On-screen keyboard for Word Bridge, laid out in the 3 physical-keyboard rows
 * players already know (QWERTY / standard Hebrew / ЙЦУКЕН) — Wordle-family
 * ergonomics. Hebrew players never need an IME: every key is a base letter and
 * sofit glyphs are rendered at word-end elsewhere. Submit + backspace flank the
 * bottom row. Neo-brutalist keys with a hard press-down feel.
 */
export default function ConnectionsKeyboard({
  rows,
  onLetter,
  onBackspace,
  onSubmit,
  backspaceLabel,
  submitLabel,
  canSubmit = false,
  disabled = false,
}: ConnectionsKeyboardProps) {
  const lastRow = rows.length - 1;
  const keyStyle = letterKeyStyle(letterColumnCount(rows));
  return (
    // The key grid is a physical-keyboard artifact, not text: on every physical
    // and mobile Hebrew keyboard (and Hebrew Wordle) ק sits at the TOP-LEFT and
    // ENTER on the left of the bottom row. Rendering under the page's rtl dir
    // mirrored the whole board (ק top-right), breaking the muscle memory this
    // layout exists to ride — so the keyboard always flows LTR regardless of locale.
    <div
      dir="ltr"
      className="flex w-full flex-col gap-1 sm:gap-2 rounded-neo border-neo-thick border-black bg-neo-navy-light p-1.5 sm:p-2 shadow-hard"
    >
      {rows.map((row, rowIdx) => (
        <m.div
          key={`row-${rowIdx}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: rowIdx * 0.06, type: 'spring', stiffness: 400, damping: 26 }}
          className="flex w-full min-w-0 items-stretch justify-center gap-1 sm:gap-1.5"
        >
          {rowIdx === lastRow && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !canSubmit}
              aria-label={submitLabel}
              title={submitLabel}
              className={`${KEY_BASE} ${KEY_SIZE} flex-[1.4] min-w-[2.6rem] bg-neo-cyan text-neo-navy active:bg-neo-cyan-light`}
            >
              <CornerDownLeft className="h-5 w-5" strokeWidth={2.75} aria-hidden="true" />
            </button>
          )}
          {row.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onLetter(ch)}
              disabled={disabled}
              aria-label={ch}
              style={keyStyle}
              className={`${KEY_BASE} ${KEY_SIZE} bg-neo-cream text-lg sm:text-xl uppercase text-neo-navy hover:bg-neo-white active:bg-neo-lime`}
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
              className={`${KEY_BASE} ${KEY_SIZE} flex-[1.4] min-w-[2.6rem] bg-neo-pink text-neo-navy active:bg-neo-pink-light`}
            >
              <Delete className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </m.div>
      ))}
    </div>
  );
}
