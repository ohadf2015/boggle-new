'use client';

import type { CSSProperties } from 'react';
import { m } from 'framer-motion';
import { Delete, Keyboard } from 'lucide-react';
import { useHoldToClear } from '@/hooks/useHoldToClear';
import { letterColumnCount } from '@/lib/connections/keyboard';
import BridgeSubmitButton from './BridgeSubmitButton';

interface ConnectionsKeyboardProps {
  /** Keyboard rows in physical-layout order (see lib/connections/keyboard.ts). */
  rows: readonly string[][];
  /** Tap a letter. */
  onLetter: (letter: string) => void;
  /** Tap backspace. */
  onBackspace: () => void;
  /** Hold backspace: clear the whole guess. */
  onClear?: () => void;
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
  /** Key a physical keypress just hit (letter, 'Enter' or 'Backspace'); shown pressed. */
  pressedKey?: string | null;
  /** Every slot is filled: the submit key lights up. */
  ready?: boolean;
  /** Fine-pointer only: tells desktop players they can type. */
  typeHint?: string;
}

const PRESSED = 'translate-x-px translate-y-px shadow-hard-pressed';
const KBD = 'rounded border-2 border-neo-cream/50 bg-neo-navy px-1.5 py-px font-mono text-[11px] font-bold text-neo-cream shadow-hard-sm';

// Same visual language as the word-wheel letters / word-hunt tiles: 3px black
// border, hard offset shadow that collapses on press with a 1px translate.
// No scale-95 — a non-uniform press reads as "danced but didn't commit" on
// slow Android frames and drives rage-re-taps (wheel lesson, PostHog 2026-04-27).
const KEY_BASE =
  'inline-flex items-center justify-center rounded-neo border-3 border-neo-black font-neo-display font-black select-none touch-manipulation transition-[transform,translate,scale,rotate,box-shadow,background-color,border-color,color,opacity] duration-75 shadow-hard active:shadow-hard-pressed active:translate-x-px active:translate-y-px disabled:opacity-40 disabled:cursor-default';

/** Shared key sizing; PuzzleCard's --conn-dock reserves 3 letter rows, the backspace row, and the submit bar. */
const KEY_SIZE =
  'h-12 [@media(max-height:800px)]:h-10 [@media(max-width:639px)_and_(min-height:780px)]:h-14 min-w-0';

/**
 * One letter-key width for the WHOLE keyboard. Every letter key gets this
 * flex-basis with grow disabled, so a 7-key row renders keys identical to a
 * 10-key row (shorter rows just center) instead of each row stretching to its
 * own width.
 *
 * The column count is the longest row (lib/connections/keyboard.ts); backspace
 * lives on its own row underneath, and a full-width submit bar sits below that.
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

/** The backspace row is a hair shorter than a letter row; PuzzleCard's --conn-dock reserves it too. */
const ACTION_SIZE = 'h-11 [@media(max-height:800px)]:h-10 min-w-0';

/**
 * On-screen keyboard for Word Bridge, laid out in the 3 physical-keyboard rows
 * players already know (QWERTY / standard Hebrew / ЙЦУКЕН) — Wordle-family
 * ergonomics. Hebrew players never need an IME: every key is a base letter and
 * sofit glyphs are rendered at word-end elsewhere. Backspace sits under the
 * letters; a long, full-width submit bar is pinned below that, with inset from
 * the screen edge and the home indicator, in the same place in every locale.
 * Neo-brutalist keys with a hard press-down feel.
 */
export default function ConnectionsKeyboard({
  rows,
  onLetter,
  onBackspace,
  onClear,
  onSubmit,
  backspaceLabel,
  submitLabel,
  canSubmit = false,
  disabled = false,
  pressedKey = null,
  ready = false,
  typeHint,
}: ConnectionsKeyboardProps) {
  const keyStyle = letterKeyStyle(letterColumnCount(rows));
  // Same as Word Tower: players hammer backspace to undo a whole wrong guess
  // (PostHog rage clicks, /he/connections/daily). Holding it clears the guess.
  const backspaceHold = useHoldToClear({ onTap: onBackspace, onHold: onClear });
  return (
    // The key grid is a physical-keyboard artifact, not text: on every physical
    // and mobile Hebrew keyboard (and Hebrew Wordle) ק sits at the TOP-LEFT and
    // ENTER on the left of the bottom row. Rendering under the page's rtl dir
    // mirrored the whole board (ק top-right), breaking the muscle memory this
    // layout exists to ride — so the keyboard always flows LTR regardless of locale.
    <div
      dir="ltr"
      className="flex w-full flex-col gap-1.5 sm:gap-2 sm:rounded-neo sm:border-2 sm:border-neo-cream/40 sm:bg-neo-navy-light sm:p-2 sm:shadow-hard"
    >
      {typeHint && (
        <p
          data-testid="connections-type-hint"
          dir="auto"
          className="hidden items-center justify-center gap-2 text-xs font-bold text-neo-cream/80 pointer-fine:flex"
        >
          <Keyboard className="h-4 w-4 text-neo-cyan" aria-hidden="true" />
          <span>{typeHint}</span>
          <span aria-hidden="true" className="text-neo-cream/40">·</span>
          <kbd className={KBD}>Enter</kbd>
          <span>{submitLabel}</span>
        </p>
      )}
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
          {row.map((ch) => (
            <button
              key={ch}
              type="button"
              onClick={() => onLetter(ch)}
              disabled={disabled}
              aria-label={ch}
              data-pressed={pressedKey === ch || undefined}
              style={keyStyle}
              className={`${KEY_BASE} ${KEY_SIZE} text-lg sm:text-xl uppercase text-neo-navy hover:bg-neo-cream active:bg-neo-lime/30 ${
                pressedKey === ch ? `${PRESSED} bg-neo-lime` : 'bg-neo-white'
              }`}
            >
              {ch}
            </button>
          ))}
        </m.div>
      ))}
      <div data-testid="keyboard-actions" className="flex w-full min-w-0 items-stretch justify-end gap-1.5">
        <button
          type="button"
          {...backspaceHold}
          disabled={disabled}
          aria-label={backspaceLabel}
          title={backspaceLabel}
          data-pressed={pressedKey === 'Backspace' || undefined}
          style={{ flex: '0 0 30%', maxWidth: '8rem', minWidth: '4.5rem' }}
          className={`${KEY_BASE} ${ACTION_SIZE} bg-neo-pink text-neo-navy active:bg-neo-pink-light ${pressedKey === 'Backspace' ? PRESSED : ''}`}
        >
          <Delete className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
      <div
        data-testid="keyboard-submit-dock"
        className="w-full px-1 pt-1 pb-3 [html:not(.has-global-bottom-nav):not(.has-admob-banner):not(.has-web-anchor-ad)_&]:pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:px-0 sm:pb-1"
      >
        <BridgeSubmitButton
          label={submitLabel}
          onSubmit={onSubmit}
          disabled={disabled || !canSubmit}
          ready={ready && canSubmit}
          pressed={pressedKey === 'Enter'}
        />
      </div>
    </div>
  );
}
