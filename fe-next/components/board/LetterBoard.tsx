'use client';

import { useEffect, useRef, type CSSProperties, type Ref } from 'react';
import type { Language, LetterGrid } from '@/types';
import { cn } from '@/lib/utils';
import { useBoardSelection, type SubmitMethod } from './useBoardSelection';
import { useBoardKeyboard } from './useBoardKeyboard';
import { clearFx, disposeFx, feedbackFx, type FeedbackKind } from './boardFx';
import { keyOf, type CellRef } from './selectionPath';
import styles from './LetterBoard.module.css';
import fx from './BoardEffects.module.css';

export type { CellRef } from './selectionPath';
export type { SubmitMethod } from './useBoardSelection';

export interface BoardFeedback {
  id: string;
  kind: FeedbackKind;
  word: string;
  score?: number;
}

export interface BoardMarks {
  golden?: ReadonlySet<string>;
  frozen?: ReadonlySet<string>;
  charged?: ReadonlySet<string>;
  meteor?: ReadonlySet<string>;
  rush?: ReadonlySet<string>;
}

export interface LetterBoardProps {
  grid: LetterGrid;
  interactive?: boolean;
  onSubmit?: (path: CellRef[], method: SubmitMethod) => void;
  onPathChange?: (path: CellRef[]) => void;
  onSingleTap?: (cell: CellRef) => void;
  onStep?: (length: number) => void;
  canEnter?: (cell: CellRef, pathLength: number) => boolean;
  adjacent?: (a: CellRef, b: CellRef) => boolean;
  autoSubmitIdleMs?: number;
  comboLevel?: number;
  fireRoundActive?: boolean;
  language?: Language;
  disableLetterKeyInput?: boolean;
  /** Blast draws its own tiles over the board; the board then only owns input and the trail. */
  ghost?: boolean;
  showPreview?: boolean;
  largeText?: boolean;
  animateOnMount?: boolean;
  shaking?: boolean;
  marks?: BoardMarks;
  eliminatedLetters?: ReadonlySet<string>;
  /** Cells lit as a hint or by typing, with their 1-based order. */
  hintPath?: ReadonlyArray<{ row: number; col: number }>;
  hintPhase?: 'blink' | 'fadeout' | null;
  feedback?: BoardFeedback | null;
  cellLabel?: (row: number, col: number, letter: string) => string;
  gridLabel?: string;
  clickHint?: string;
  className?: string;
  gridClassName?: string;
  gridStyle?: CSSProperties;
  gridRef?: Ref<HTMLDivElement>;
}

function markAttrs(key: string, marks: BoardMarks | undefined) {
  if (!marks) return {};
  return {
    'data-golden': marks.golden?.has(key) ? '' : undefined,
    'data-frozen': marks.frozen?.has(key) ? '' : undefined,
    'data-charged': marks.charged?.has(key) ? '' : undefined,
    'data-meteor': marks.meteor?.has(key) ? '' : undefined,
    'data-rush': marks.rush?.has(key) ? '' : undefined,
  };
}

function isMarked(key: string, marks: BoardMarks | undefined): boolean {
  return !!marks && Object.values(marks).some((set) => set?.has(key));
}

/**
 * The letter board every grid mode plays on. React renders the tiles once per
 * board; the live selection, trail, preview and release effects are painted
 * straight onto this DOM by the selection engine.
 */
export default function LetterBoard({
  grid,
  interactive = false,
  onSubmit,
  onPathChange,
  onSingleTap,
  onStep,
  canEnter,
  adjacent,
  autoSubmitIdleMs,
  comboLevel = 0,
  fireRoundActive = false,
  language = 'en',
  disableLetterKeyInput = false,
  ghost = false,
  showPreview = true,
  largeText = false,
  animateOnMount = false,
  shaking = false,
  marks,
  eliminatedLetters,
  hintPath,
  hintPhase = null,
  feedback,
  cellLabel,
  gridLabel,
  clickHint,
  className,
  gridClassName,
  gridStyle,
  gridRef,
}: LetterBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const api = useBoardSelection(containerRef, {
    interactive,
    onSubmit,
    onPathChange,
    onSingleTap,
    onStep,
    canEnter,
    adjacent,
    autoSubmitIdleMs,
    comboLevel,
    fireRoundActive,
  });
  useBoardKeyboard(containerRef, api, { grid, interactive, language, disableLetterKeyInput, fireRoundActive });

  const seed = grid.map((r) => r.join('')).join('|');
  useEffect(() => {
    const el = containerRef.current;
    if (el) clearFx(el);
    if (api.current?.getPath().length) api.current.setPath([]);
  }, [seed, api]);

  useEffect(() => {
    if (!interactive && api.current?.getPath().length) api.current.setPath([]);
  }, [interactive, api]);

  useEffect(() => {
    const el = containerRef.current;
    return () => {
      if (el) disposeFx(el);
    };
  }, []);

  const lastFeedbackId = useRef<string | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!feedback || !el || feedback.id === lastFeedbackId.current) return;
    lastFeedbackId.current = feedback.id;
    feedbackFx(el, feedback.kind, feedback.score, feedback.word);
  }, [feedback]);

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  const hintOrder = new Map<string, number>();
  hintPath?.forEach((c, i) => hintOrder.set(keyOf(c.row, c.col), i + 1));
  const template: CSSProperties = {
    gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
  };

  return (
    <div
      ref={containerRef}
      data-board=""
      // FDT: tile taps / path drags / double-click submit are the game, not rage.
      data-feedback-ignore-rage={interactive ? '' : undefined}
      data-ghost={ghost ? '' : undefined}
      data-enter={animateOnMount ? '' : undefined}
      data-shaking={shaking ? '' : undefined}
      data-hint-phase={hintPhase ?? undefined}
      data-mode="idle"
      data-len="0"
      data-heat="0"
      data-word-dir={language === 'he' ? 'rtl' : 'ltr'}
      className={cn(styles.board, className)}
      // Intentional multi-tap / double-click-submit surface; skip GR rage
      // (same class as canvas / imposketch opt-out). Ghost boards stay measurable.
      data-gr-no-rage={interactive && !ghost ? '' : undefined}
    >
      {showPreview && !ghost && (
        <div data-board-preview="" className={fx.preview} dir={language === 'he' ? 'rtl' : 'ltr'} aria-hidden="true">
          <span data-preview-word="" className={fx.word} />
          <span data-preview-count="" className={fx.count} />
        </div>
      )}
      {clickHint && interactive && !ghost && (
        <div className={fx.clickHint} aria-hidden="true">{clickHint}</div>
      )}
      <div
        ref={gridRef}
        dir="ltr"
        role="grid"
        aria-label={gridLabel}
        tabIndex={interactive ? 0 : -1}
        data-tutorial="grid"
        data-gr-no-rage={interactive && !ghost ? '' : undefined}
        className={cn(styles.grid, gridClassName)}
        style={{
          ...template,
          ['--cell-font-size' as string]: `calc((100cqw / ${cols || 4}) * ${largeText ? 0.66 : 0.52})`,
          ...gridStyle,
        }}
      >
        {grid.map((row, r) =>
          row.map((letter, c) => {
            const key = keyOf(r, c);
            const order = hintOrder.get(key);
            const eliminated = eliminatedLetters?.has(letter.toUpperCase()) ?? false;
            return (
              <div
                key={key}
                role="gridcell"
                data-tile=""
                data-row={r}
                data-col={c}
                data-letter={letter}
                data-key={key}
                data-empty={letter ? undefined : ''}
                data-hint={order ? '' : undefined}
                data-eliminated={eliminated ? '' : undefined}
                {...markAttrs(key, marks)}
                aria-label={cellLabel?.(r, c, letter)}
                className={cn(styles.tile, !ghost && !order && !eliminated && !isMarked(key, marks) && 'letter-tile-gradient')}
                style={{ ['--enter-i' as string]: r * cols + c }}
              >
                {order && <span className={styles.badge}>{order}</span>}
                {marks?.golden?.has(key) && <span className={styles.mark}>★</span>}
              </div>
            );
          }),
        )}
        <svg data-board-trail="" className={styles.trail} aria-hidden="true">
          <polyline data-trail-echo="" />
          <polyline data-trail="ink" />
          <polyline data-tail="ink" />
          <polyline data-trail="core" />
          <polyline data-tail="core" />
          <polyline data-trail="shine" />
          <circle data-finger="" data-off="" r="0" />
        </svg>
        <div className={styles.glyphs} style={template} aria-hidden="true">
          {grid.map((row, r) =>
            row.map((letter, c) => {
              const key = keyOf(r, c);
              return (
                <span
                  key={key}
                  data-gk={key}
                  data-eliminated={eliminatedLetters?.has(letter.toUpperCase()) ? '' : undefined}
                  className={styles.glyph}
                  style={{ ['--enter-i' as string]: r * cols + c }}
                >
                  {ghost ? '' : letter}
                </span>
              );
            }),
          )}
        </div>
        <div data-board-fx="" className={fx.layer} aria-hidden="true" />
      </div>
      <div data-board-status="" className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
