'use client';

import { memo, useCallback, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react';
import { Delete, Shuffle, Undo2 } from 'lucide-react';
import { LetterRow, WordBox } from './LetterRow';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Props {
  t: T;
  dockRef: RefObject<HTMLDivElement | null>;
  wide: boolean;
  dir: 'ltr' | 'rtl';
  swinging: boolean;
  composing: boolean;
  rejected: string | null;
  dictError: boolean;
  scrambles: number;
  wheel: string[];
  selected: number[];
  word: string;
  valid: boolean;
  reducedMotion: boolean;
  /** The hanging word can still be put back (only while it hangs, once). */
  canPutBack: boolean;
  /** Merged stability + brace control, rendered in the dock row next to the wheel. */
  stabilitySlot?: ReactNode;
  /** Wide only: the found-floors panel, filling the side panel under the wheel. */
  feedSlot?: ReactNode;
  onScramble: () => void;
  onSelectTile: (i: number) => void;
  onDeselectTile: (i: number) => void;
  onSubmit: () => void;
  onDrop: () => void;
  onPutBack: () => void;
  onBackspace: () => void;
  /** Long-press on backspace: rub out the whole word at once. */
  onClearWord?: () => void;
  /** A real word to light up for a stuck new player (tray slots), or null. */
  hint?: number[] | null;
}

/** Hold this long on backspace to clear the whole word. */
export const CLEAR_WORD_HOLD_MS = 450;

/**
 * The controls: the word between shuffle and backspace / put-back, the letters
 * in one row, and one button that builds the word and then drops it.
 *
 * It replaced the swipe wheel, which players found busy and which took about a
 * third of a phone's height. Its measured height still frames the ground
 * (WordTowerV2), so the camera simply gets the room back.
 */
export const V2Dock = memo(function V2Dock(p: Props) {
  const { t } = p;
  // Rage clicks on backspace were the #1 frustration signal on Word Tower
  // (PostHog, Oct 2026): players hammer it to undo a long wrong word. Holding
  // it now clears the word in one go; the click that ends the hold is eaten so
  // it can't also rub out a letter of the NEXT word.
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFired = useRef(false);
  const cancelHold = () => {
    if (holdTimer.current) { clearTimeout(holdTimer.current); holdTimer.current = null; }
  };
  useEffect(() => cancelHold, []);
  const onBackspaceDown = () => {
    holdFired.current = false;
    cancelHold();
    if (p.swinging || !p.onClearWord) return;
    holdTimer.current = setTimeout(() => {
      holdTimer.current = null;
      holdFired.current = true;
      p.onClearWord?.();
    }, CLEAR_WORD_HOLD_MS);
  };
  const onBackspaceClick = () => {
    cancelHold();
    if (holdFired.current) { holdFired.current = false; return; }
    if (p.swinging) p.onPutBack(); else p.onBackspace();
  };
  const tray = useMemo(() => p.wheel.map((l) => l.toUpperCase()), [p.wheel]);
  const wordLetters = useMemo(() => p.selected.map((i) => tray[i] ?? ''), [p.selected, tray]);
  // Keep letters 0..k: rewinding the path to before letter k+1 drops it and everything after.
  const { selected, onDeselectTile } = p;
  const cutTo = useCallback(
    (k: number) => {
      const next = selected[k + 1];
      if (next !== undefined) onDeselectTile(next);
    },
    [selected, onDeselectTile],
  );
  const feed = p.wide ? p.feedSlot : null;

  const scramble = (
    <button
      type="button"
      onClick={p.onScramble}
      disabled={p.scrambles === 0 || !p.composing}
      aria-label={t('wordTower.hud.scramble')}
      className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-purple text-neo-navy shadow-hard lg:h-14 lg:w-14 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none"
    >
      <Shuffle className="h-6 w-6" aria-hidden />
      <span className="absolute -end-2 -top-2 rounded-full border-neo border-black bg-neo-cream px-1.5 font-neo-display text-xs font-black">
        {p.scrambles}
      </span>
    </button>
  );

  // One slot, two jobs: rub out a letter while spelling, take the whole word
  // back off the hook while it hangs.
  const backspace = (
    <button
      type="button"
      onClick={onBackspaceClick}
      onPointerDown={onBackspaceDown}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onContextMenu={(e) => e.preventDefault()}
      disabled={p.swinging ? !p.canPutBack : p.selected.length === 0 || !p.composing}
      aria-label={t(p.swinging ? 'wordTowerV2.changeWord' : 'wordTower.hud.backspace')}
      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-neo border-neo-thick border-black text-neo-navy shadow-hard transition-colors lg:h-14 lg:w-14 active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none ${
        p.swinging ? 'bg-neo-pink' : 'bg-neo-cream'
      }`}
    >
      {p.swinging ? <Undo2 className="h-6 w-6" aria-hidden /> : <Delete className="h-6 w-6" aria-hidden />}
    </button>
  );

  return (
    <div
      ref={p.dockRef}
      // FDT: tower tiles + backspace are tapped rapidly by design.
      data-feedback-ignore-rage=""
      className={
        p.wide && feed
          ? 'absolute bottom-0 end-0 top-0 z-30 flex w-[22rem] flex-col justify-start gap-4 border-s-4 border-neo-cream/30 bg-neo-navy px-5 pb-4 pt-14 xl:w-[26rem]'
          : p.wide
          ? 'absolute bottom-0 end-0 top-0 z-30 flex w-[22rem] flex-col justify-center border-s-4 border-neo-cream/30 bg-neo-navy px-6 pb-24 xl:w-[26rem]'
          : // Phone: one short solid panel (word, one row of letters, one button)
            // instead of the tall transparent wheel strip, so the tower keeps
            // the screen above it.
            'absolute inset-x-0 bottom-0 z-30 border-t-4 border-neo-cream/20 bg-neo-navy/90 px-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem),calc(var(--cap-safe-area-bottom,0px)+0.5rem))] pt-3'
      }
    >
      {p.rejected ? (
        <div className="absolute inset-x-0 -top-10 z-40 mx-auto w-fit rounded-neo border-neo border-black bg-neo-red px-3 py-1 font-neo-display text-sm font-bold text-neo-navy shadow-hard animate-neo-shake">
          {t(p.rejected.includes('.') ? p.rejected : `wordTower.error.${p.rejected}`)}
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-md flex-col gap-2.5 lg:gap-3">
        {/* Phone: the stability meter heads the panel (never floating over the
            tower); it keeps its row while hidden, so the camera never jumps. */}
        {!p.wide && p.stabilitySlot ? <div className="pointer-events-auto flex justify-center">{p.stabilitySlot}</div> : null}
        {p.dictError ? (
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mx-auto rounded-neo border-neo-thick border-black bg-neo-red px-6 py-3 font-neo-display text-base font-bold uppercase text-neo-navy shadow-hard"
          >
            {t('wordTower.loadError')}
          </button>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {scramble}
              <WordBox
                t={t}
                letters={wordLetters}
                placing={p.swinging}
                canCut={p.composing && !p.swinging}
                reducedMotion={p.reducedMotion}
                onCutTo={cutTo}
              />
              {backspace}
            </div>
            <LetterRow
              t={t}
              tray={tray}
              selected={p.selected}
              placing={p.swinging}
              canBuild={p.valid}
              reducedMotion={p.reducedMotion}
              dir={p.dir}
              onSelectTile={p.onSelectTile}
              onDeselectTile={p.onDeselectTile}
              onSubmit={p.onSubmit}
              onDrop={p.onDrop}
              hint={p.hint}
            />
          </>
        )}
      </div>

      {/* Wide layout: stability slot under the controls */}
      {p.wide && p.stabilitySlot && <div className="pointer-events-auto mt-4 flex justify-center">{p.stabilitySlot}</div>}
      {feed ? <div className="flex min-h-0 flex-1 flex-col">{feed}</div> : null}
    </div>
  );
});
