'use client';

import type { CSSProperties } from 'react';
import { m } from 'framer-motion';
import { Delete, CornerDownLeft } from 'lucide-react';
import { ACTION_KEY_WIDTH, backspaceRowIndex, letterColumnCount } from '@/lib/connections/keyboard';

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

// Same visual language as the word-wheel letters / word-hunt tiles: 3px black
// border, hard offset shadow that collapses on press with a 1px translate.
// No scale-95 — a non-uniform press reads as "danced but didn't commit" on
// slow Android frames and drives rage-re-taps (wheel lesson, PostHog 2026-04-27).
const KEY_BASE =
  'inline-flex items-center justify-center rounded-neo border-3 border-neo-black font-neo-display font-black select-none touch-manipulation transition-all duration-75 shadow-hard active:shadow-hard-pressed active:translate-x-px active:translate-y-px disabled:opacity-40 disabled:cursor-default';

/** Shared key sizing — taller keys, no basis floor, so no key squashes. */
const KEY_SIZE = 'h-12 sm:h-14 min-w-0';

/**
 * One letter-key width for the WHOLE keyboard. Every letter key gets this
 * flex-basis with grow disabled, so a 7-key row renders keys identical to a
 * 10-key row (shorter rows just center) instead of each row stretching to its
 * own width.
 *
 * The column count comes from letterColumnCount, which reserves room for the
 * submit/backspace keys on whichever rows carry them (Hebrew moves backspace
 * to its short top row). See lib/connections/keyboard.ts.
 *
 * The minWidth floor is pure catastrophe insurance: it never binds in a
 * healthy layout (even a 12-key Russian row on a 280px Fold computes ~13px
 * above it), but if a row is ever over-subscribed (e.g. a transient
 * hydration-recovery DOM mid-deploy) shrink stops at a tappable key instead
 * of crushing letters to their 6px borders — overflow is visible and
 * debuggable, a 6px pill is not (t_55afcea2).
 */
function letterKeyStyle(columns: number): CSSProperties {
  return {
    flexBasis: `calc(${(100 / columns).toFixed(4)}% - 0.25rem)`,
    flexGrow: 0,
    flexShrink: 1,
    minWidth: '0.875rem',
  };
}

/** Action keys take a fixed ACTION_KEY_WIDTH share of the same column grid. */
function actionKeyStyle(columns: number): CSSProperties {
  return {
    flexBasis: `calc(${((100 * ACTION_KEY_WIDTH) / columns).toFixed(4)}% - 0.25rem)`,
    flexGrow: 0,
    flexShrink: 1,
    minWidth: '2rem',
  };
}

/**
 * On-screen keyboard for Word Bridge, laid out in the 3 physical-keyboard rows
 * players already know (QWERTY / standard Hebrew / ЙЦУКЕН) — Wordle-family
 * ergonomics. Hebrew players never need an IME: every key is a base letter and
 * sofit glyphs are rendered at word-end elsewhere. Submit + backspace flank the
 * bottom row, except where it is full (Hebrew: backspace sits top-right).
 * Neo-brutalist keys with a hard press-down feel.
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
  const bsRow = backspaceRowIndex(rows);
  const columns = letterColumnCount(rows);
  const keyStyle = letterKeyStyle(columns);
  const actionStyle = actionKeyStyle(columns);
  return (
    // The key grid is a physical-keyboard artifact, not text: on every physical
    // and mobile Hebrew keyboard (and Hebrew Wordle) ק sits at the TOP-LEFT and
    // ENTER on the left of the bottom row. Rendering under the page's rtl dir
    // mirrored the whole board (ק top-right), breaking the muscle memory this
    // layout exists to ride — so the keyboard always flows LTR regardless of locale.
    <div
      dir="ltr"
      className="flex w-full flex-col gap-1.5 sm:gap-2 rounded-neo border-neo-thick border-black bg-neo-navy-light p-1 sm:p-2 shadow-hard"
    >
      {rows.map((row, rowIdx) => (
        <m.div
          key={`row-${rowIdx}`}
          // Transform only — never `opacity: 0` (same lesson as PuzzleCard's
          // entrance): `m` stays frozen on `initial` until hydration runs, so
          // an invisible start renders the whole keyboard as an empty box for
          // seconds on slow connections — measured live at 0-4s under 400ms
          // latency / 6x CPU throttle (t_55afcea2). A position-only entrance
          // degrades to "keys sit 10px low until JS arrives" — fully tappable.
          initial={{ y: 10 }}
          animate={{ y: 0 }}
          transition={{ delay: rowIdx * 0.06, type: 'spring', stiffness: 400, damping: 26 }}
          className="flex w-full min-w-0 items-stretch justify-center gap-1"
        >
          {rowIdx === lastRow && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={disabled || !canSubmit}
              aria-label={submitLabel}
              title={submitLabel}
              style={actionStyle}
              className={`${KEY_BASE} ${KEY_SIZE} bg-neo-cyan text-neo-navy active:bg-neo-cyan-light`}
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
              className={`${KEY_BASE} ${KEY_SIZE} bg-neo-white text-lg sm:text-xl uppercase text-neo-navy hover:bg-neo-cream active:bg-neo-lime/30`}
            >
              {ch}
            </button>
          ))}
          {rowIdx === bsRow && (
            <button
              type="button"
              onClick={onBackspace}
              disabled={disabled}
              aria-label={backspaceLabel}
              title={backspaceLabel}
              style={actionStyle}
              className={`${KEY_BASE} ${KEY_SIZE} bg-neo-pink text-neo-navy active:bg-neo-pink-light`}
            >
              <Delete className="h-5 w-5" strokeWidth={2.5} aria-hidden="true" />
            </button>
          )}
        </m.div>
      ))}
    </div>
  );
}
