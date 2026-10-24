import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../lib/utils';
import type { LetterGrid, Language } from '@/types';
import { useGridAriaLabels } from '@/hooks/useGridAriaLabels';
import ComboIndicator from './grid/ComboIndicator';
import type { SelectedCell } from './grid/types';
import { DEFAULT_DESKTOP_AUTOSUBMIT_MS } from './grid/submitHintVisibility';
import { GRID_GAP_CLASS } from './grid/gridLayoutConstants';
import LetterBoard, { type BoardFeedback, type CellRef, type SubmitMethod } from './board/LetterBoard';
import { usePrefersReducedMotion } from './board/usePrefersReducedMotion';
import BoardHandCoach from './tutorial/BoardHandCoach';
import { useDisableEarthquakeEffects, useLargeLetters } from '@/contexts/AccessibilityContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { WordFeedback } from './game/WordFormingArea';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';

export interface HighlightedCell {
  row: number;
  col: number;
}

export type GridEffectsProfile = 'full' | 'lean';

interface GridComponentProps {
  grid: LetterGrid;
  interactive?: boolean;
  onWordSubmit?: (word: string, meta?: { inputMethod: 'kb' | 'drag' }) => void;
  onPathSubmit?: (cells: SelectedCell[]) => void;
  className?: string;
  largeText?: boolean;
  comboLevel?: number;
  animateOnMount?: boolean;
  fireRoundActive?: boolean;
  earthquakeShaking?: boolean;
  onWordChange?: (word: string, letterCount: number) => void;
  hideWordPreview?: boolean;
  hideComboIndicator?: boolean;
  highlightedPath?: HighlightedCell[];
  eliminatedLetters?: Set<string>;
  onSingleTapDetected?: (cell: { row: number; col: number; letter: string }) => void;
  language?: Language;
  disableLetterKeyInput?: boolean;
  onSelectionChange?: (cells: SelectedCell[]) => void;
  /** Whether keyboard typing mode is active (from useKeyboardWordInput) */
  isTypingMode?: boolean;
  /** Return false to keep a cell out of the path (e.g. ice tiles). Third arg is the current path length. */
  cellFilter?: (row: number, col: number, currentPathLength?: number) => boolean;
  goldenLetters?: Array<{ row: number; col: number }>;
  frozenTiles?: Set<string>;
  chargedTiles?: Set<string>;
  meteorTiles?: Set<string>;
  rushTiles?: Set<string>;
  /** Blast draws its own tiles over the board; the board then only owns input and the trail. */
  ghostCells?: boolean;
  /** Return true if cell2 is reachable from cell1 (e.g. portal teleportation). */
  isAdjacent?: (cell1: { row: number; col: number }, cell2: { row: number; col: number }) => boolean;
  /** Desktop idle auto-submit (ms) for a 3+ letter selection. Defaults to 1s in every mode. */
  autoSubmitIdleMs?: number;
  /** Kept for callers; the shared board has one visual profile. */
  effectsProfile?: GridEffectsProfile;
  /** Latest word-submit feedback: the tiles of that word celebrate or shrug. */
  submitFeedback?: WordFeedback | null;
  /** First-play hand coach tracing a path over the board. Shown once per device. */
  showHandCoach?: boolean;
  /** Force a tile skin (e.g. an adventure world's skin) over the player's equipped one. */
  tileSkinOverride?: string;
}

const HINT_BLINK_MS = 1500;
const HINT_FADE_MS = 1000;

const toSelected = (path: CellRef[]): SelectedCell[] => path.map((c) => ({ row: c.row, col: c.col, letter: c.letter }));

function toBoardFeedback(f: WordFeedback | null | undefined): BoardFeedback | null {
  if (!f) return null;
  const kind = f.type === 'accepted' ? 'ok' : f.type === 'rejected' ? 'bad' : 'dupe';
  return { id: f.id, kind, word: f.word, score: f.score };
}

const GridComponent = memo<GridComponentProps>(({
  grid,
  interactive = false,
  onWordSubmit,
  onPathSubmit,
  className,
  largeText = false,
  comboLevel = 0,
  animateOnMount = false,
  fireRoundActive = false,
  earthquakeShaking = false,
  onWordChange,
  hideWordPreview = false,
  hideComboIndicator = false,
  highlightedPath,
  eliminatedLetters,
  onSingleTapDetected,
  language = 'en',
  disableLetterKeyInput = false,
  onSelectionChange,
  cellFilter,
  goldenLetters,
  frozenTiles,
  chargedTiles,
  meteorTiles,
  rushTiles,
  ghostCells = false,
  isAdjacent,
  autoSubmitIdleMs = DEFAULT_DESKTOP_AUTOSUBMIT_MS,
  submitFeedback,
  showHandCoach = false,
  tileSkinOverride,
}) => {
  const { t } = useLanguage();
  const reduceMotion = usePrefersReducedMotion();
  const [gridNode, setGridNode] = useState<HTMLDivElement | null>(null);

  const equippedBoardTheme = useEquippedCosmetic('boardTheme');
  const playerTileSkin = useEquippedCosmetic('tileSkin');
  const tileSkin = tileSkinOverride ?? playerTileSkin;
  const a11yLargeLetters = useLargeLetters();
  const effectiveLargeText = largeText || a11yLargeLetters;
  const quakeOff = useDisableEarthquakeEffects() || reduceMotion;
  const { playTileSelectSound, playEarthquakeRumble, playEarthquakeShake } = useSoundEffects();

  const handleSubmit = useCallback((path: CellRef[], method: SubmitMethod) => {
    const cells = toSelected(path);
    onPathSubmit?.(cells);
    onWordSubmit?.(cells.map((c) => c.letter).join(''), { inputMethod: method === 'kb' ? 'kb' : 'drag' });
  }, [onPathSubmit, onWordSubmit]);

  const handlePathChange = useCallback((path: CellRef[]) => {
    const cells = toSelected(path);
    onWordChange?.(cells.map((c) => c.letter).join(''), cells.length);
    onSelectionChange?.(cells);
  }, [onWordChange, onSelectionChange]);

  const handleStep = useCallback(() => {
    if (!ghostCells) playTileSelectSound?.();
  }, [ghostCells, playTileSelectSound]);

  const canEnter = useMemo(
    () => (cellFilter ? (cell: CellRef, len: number) => cellFilter(cell.row, cell.col, len) : undefined),
    [cellFilter],
  );

  const marks = useMemo(() => ({
    golden: goldenLetters?.length ? new Set(goldenLetters.map((c) => `${c.row}-${c.col}`)) : undefined,
    frozen: frozenTiles,
    charged: chargedTiles,
    meteor: meteorTiles,
    rush: rushTiles,
  }), [goldenLetters, frozenTiles, chargedTiles, meteorTiles, rushTiles]);

  const [hintPhase, setHintPhase] = useState<'blink' | 'fadeout' | null>(null);
  const hintKey = highlightedPath?.map((c) => `${c.row}-${c.col}`).join(',') ?? '';
  useEffect(() => {
    if (!hintKey) {
      setHintPhase(null);
      return undefined;
    }
    setHintPhase('blink');
    const fade = setTimeout(() => setHintPhase('fadeout'), HINT_BLINK_MS);
    const done = setTimeout(() => setHintPhase(null), HINT_BLINK_MS + HINT_FADE_MS);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, [hintKey]);

  const shaking = earthquakeShaking && !quakeOff;
  const wasShaking = useRef(false);
  useEffect(() => {
    if (earthquakeShaking && !wasShaking.current) {
      playEarthquakeRumble?.();
      const id = setTimeout(() => playEarthquakeShake?.(), 400);
      wasShaking.current = true;
      return () => clearTimeout(id);
    }
    if (!earthquakeShaking) wasShaking.current = false;
    return undefined;
  }, [earthquakeShaking, playEarthquakeRumble, playEarthquakeShake]);

  useEffect(() => {
    if (interactive) gridNode?.focus({ preventScroll: true });
  }, [interactive, gridNode]);

  const boardSeed = grid.map((r) => r.join('')).join('|');
  const ariaLabels = useGridAriaLabels(grid, boardSeed);
  const cellLabel = useCallback((r: number, c: number) => ariaLabels[`${r},${c}`] ?? '', [ariaLabels]);
  const feedback = useMemo(() => toBoardFeedback(submitFeedback), [submitFeedback]);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {!hideComboIndicator && <ComboIndicator comboLevel={comboLevel} reduceMotion={reduceMotion} />}
      <div
        className={cn('game-board-frame relative', equippedBoardTheme && `cosmetic-board-${equippedBoardTheme.replace('board-', '')}`)}
        {...(tileSkin && { 'data-tile-skin': tileSkin.replace('tile-', '') })}
      >
        <LetterBoard
          grid={grid}
          interactive={interactive}
          onSubmit={handleSubmit}
          onPathChange={handlePathChange}
          onSingleTap={onSingleTapDetected}
          onStep={handleStep}
          canEnter={canEnter}
          adjacent={isAdjacent}
          autoSubmitIdleMs={autoSubmitIdleMs}
          comboLevel={comboLevel}
          fireRoundActive={fireRoundActive}
          language={language}
          disableLetterKeyInput={disableLetterKeyInput}
          ghost={ghostCells}
          showPreview={!hideWordPreview}
          largeText={effectiveLargeText}
          animateOnMount={animateOnMount && !reduceMotion}
          shaking={shaking}
          marks={marks}
          eliminatedLetters={eliminatedLetters}
          hintPath={highlightedPath}
          hintPhase={hintPhase}
          feedback={feedback}
          cellLabel={cellLabel}
          gridLabel={t('game.grid.label', 'Letter grid')}
          clickHint={t('game.doubleClickToSubmit', 'Double-click last letter to submit')}
          lockedHint={t('game.boardLocked', "Wait for GO — this board isn't live yet")}
          gridClassName={cn(ghostCells && GRID_GAP_CLASS, className)}
          gridRef={setGridNode}
        />
        {showHandCoach && (
          <BoardHandCoach
            gridEl={gridNode}
            rows={grid.length}
            cols={grid[0]?.length ?? 0}
            path={highlightedPath && highlightedPath.length >= 2 ? highlightedPath : null}
          />
        )}
      </div>
    </div>
  );
});

GridComponent.displayName = 'GridComponent';

export default GridComponent;
