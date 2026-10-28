'use client';

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTile } from './BlastTile';
import type { SelectedCell } from '@/components/grid';
import type { WordFeedback } from '@/components/game/WordFormingArea';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from './types';
import type { SequencerState, TileAnimState } from './hooks/useBlastSequencer';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';
import { DESKTOP_IDLE_AUTOSUBMIT_MS } from '@/components/grid/submitHintVisibility';
import { useLanguage } from '@/contexts/LanguageContext';
import { useEquippedCosmetic } from '@/hooks/useEquippedCosmetic';
import { COMBO_ELIGIBLE_TILES } from './utils/blastCombos';
import { getTileTooltip } from './utils/blastTileTooltips';

const TILE_TOOLTIP_HOLD_MS = 550;

export interface BlastBoardProps {
  grid: LetterGrid;
  tileStates: BlastTileState[][];
  gridSize: number;
  language: Language;
  interactive: boolean;
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  sequencerState?: SequencerState;
  nearMissCells?: Array<{ row: number; col: number }>;
  /** Cells highlighted during cascade discovery — glow before clearing */
  cascadeHighlightCells?: Array<{ row: number; col: number }>;
  /**
   * Multiplayer round — suppress the per-tile explanation tooltips (the mobile
   * info pop-up + the native `title` hint). In a timed competitive MP game the
   * descriptions are distracting clutter; single-player keeps them as a learning
   * aid.
   */
  isMultiplayer?: boolean;
  /** Verdict on the last submitted word; the shared board lifts and rewards it. */
  submitFeedback?: WordFeedback | null;
}

/**
 * BlastBoard - Game grid wrapping GridComponent with blast-specific tile overlays.
 *
 * Layers (bottom to top):
 * 1. GridComponent — proven word input with touch/drag interaction
 * 2. BlastTile overlay grid — special tile backgrounds, indicators, selection glow
 */
export const BlastBoard = memo(function BlastBoard({
  grid,
  tileStates,
  gridSize,
  language,
  interactive,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  sequencerState,
  nearMissCells = [],
  cascadeHighlightCells = [],
  isMultiplayer = false,
  submitFeedback,
}: BlastBoardProps) {
  const { t } = useLanguage();
  const equippedBoardTheme = useEquippedCosmetic('boardTheme');
  const equippedTileSkin = useEquippedCosmetic('tileSkin');
  const gridStyle = useMemo(() => ({
    padding: GRID_PADDING,
    gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
  }), [gridSize]);
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize to 1 (not 0) so the overlay grid renders immediately.
  // Fall animation pixel math degrades gracefully until ResizeObserver fires.
  const [containerWidth, setContainerWidth] = useState(1);

  // Measure container for overlay alignment
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  // Track selected cells for overlay selection glow
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const handleSelectionChange = useCallback((cells: SelectedCell[]) => {
    setSelectedCells(cells);
  }, []);

  const selectedPositions = useMemo(
    () => new Set(selectedCells.map((c) => `${c.row}-${c.col}`)),
    [selectedCells],
  );

  // Selection index map — position of each cell in the word path
  const selectionIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < selectedCells.length; i++) {
      map.set(`${selectedCells[i].row}-${selectedCells[i].col}`, i);
    }
    return map;
  }, [selectedCells]);

  const nearMissSet = useMemo(
    () => new Set(nearMissCells.map(c => `${c.row}-${c.col}`)),
    [nearMissCells],
  );

  const cascadeHighlightSet = useMemo(
    () => new Set(cascadeHighlightCells.map(c => `${c.row}-${c.col}`)),
    [cascadeHighlightCells],
  );

  // Combo preview: detect if 2+ combo-eligible tiles are in the current selection
  const comboPreviewSet = useMemo(() => {
    if (selectedCells.length < 2) return null;
    const eligibleKeys: string[] = [];
    for (const cell of selectedCells) {
      const tile = tileStates[cell.row]?.[cell.col];
      if (tile && !tile.isCleared && COMBO_ELIGIBLE_TILES.has(tile.type)) {
        eligibleKeys.push(`${cell.row}-${cell.col}`);
      }
    }
    return eligibleKeys.length >= 2 ? new Set(eligibleKeys) : null;
  }, [selectedCells, tileStates]);

  // Build a lookup map from sequencer active tiles
  const animLookup = useMemo(() => {
    if (!sequencerState?.activeTiles.length) return null;
    const map = new Map<string, TileAnimState>();
    for (const t of sequencerState.activeTiles) {
      map.set(`${t.row}-${t.col}`, t);
    }
    return map;
  }, [sequencerState]);

  // A finger held on one special tile asks what it does; a drag that moves on does not.
  const singleKey = selectedCells.length === 1 ? `${selectedCells[0].row}-${selectedCells[0].col}` : null;
  const [heldKey, setHeldKey] = useState<string | null>(null);
  useEffect(() => {
    setHeldKey(null);
    if (!singleKey || isMultiplayer) return undefined;
    const id = window.setTimeout(() => setHeldKey(singleKey), TILE_TOOLTIP_HOLD_MS);
    return () => window.clearTimeout(id);
  }, [singleKey, isMultiplayer]);

  const singleTileTooltip = useMemo(() => {
    if (!heldKey || heldKey !== singleKey) return null;
    const c = selectedCells[0];
    const tile = tileStates[c.row]?.[c.col];
    if (!tile || tile.type === 'standard') return null;
    const tooltip = getTileTooltip(tile.type, t);
    if (!tooltip) return null;
    return { ...tooltip, row: c.row, col: c.col };
  }, [heldKey, singleKey, selectedCells, tileStates, t]);

  // Only render overlay once we have tile states
  const hasTileStates = tileStates.length > 0 && tileStates[0]?.length > 0;

  return (
    <div
      ref={containerRef}
      className={`blast-board relative w-full aspect-square overflow-hidden${equippedBoardTheme ? ` cosmetic-board-${equippedBoardTheme.replace('board-', '')}` : ''}`}
      {...(equippedTileSkin && { 'data-tile-skin': equippedTileSkin.replace('tile-', '') })}
      style={{ contain: 'layout paint' }}
    >
      {/* Layer 1: GridComponent — word selection via touch/drag */}
      <GridComponent
        grid={grid}
        interactive={interactive}
        onWordSubmit={onWordSubmit}
        onPathSubmit={onPathSubmit}
        onWordChange={onWordChange}
        onSelectionChange={handleSelectionChange}
        autoSubmitIdleMs={DESKTOP_IDLE_AUTOSUBMIT_MS}
        hideWordPreview
        hideComboIndicator
        largeText
        language={language}
        ghostCells
        submitFeedback={submitFeedback}
        lockedHint={t('blast.boardBusy')}
      />

      {/* Layer 2: Blast tile type overlay — indicators, special backgrounds, selection glow */}
      {hasTileStates && containerWidth > 0 && (
        <div
          dir="ltr"
          className={`absolute inset-0 pointer-events-none z-[10] grid ${GRID_GAP_CLASS}`}
          style={gridStyle}
          aria-hidden="true"
        >
          {tileStates.flat().map((tile) => {
            const key = `${tile.row}-${tile.col}`;
            const isSelected = selectedPositions.has(key);
            const animState = animLookup?.get(key);
            // Map sequencer AnimPhase to BlastTile TilePhase (chain_pause maps to idle)
            const rawPhase = animState?.phase;
            const tilePhase = rawPhase && rawPhase !== 'chain_pause' ? rawPhase : (isSelected ? 'selected' : 'idle');

            // Empty/cleared cell — invisible placeholder to keep grid alignment
            if (tile.isCleared && !animState) {
              return (
                <div
                  key={key}
                  role="gridcell"
                  aria-hidden="true"
                  className="aspect-square rounded-neo"
                  style={{ visibility: 'hidden' }}
                />
              );
            }

            // Always render BlastTile for non-cleared tiles so standard tiles stay visible

            const letter = grid[tile.row]?.[tile.col] ?? '';
            const cellHeight = containerWidth / gridSize;

            return (
              <BlastTile
                key={key}
                letter={letter}
                type={tile.type}
                phase={tilePhase}
                isSelected={isSelected}
                isCleared={tile.isCleared}
                isNearMiss={nearMissSet.has(key)}
                activationEffect={tile.activationEffect}
                isComboPreview={comboPreviewSet?.has(key) ?? false}
                selectionIndex={selectionIndexMap.get(key)}
                selectionTotal={selectedCells.length}
                isCascadeHighlight={cascadeHighlightSet.has(key)}
                zonePreview={isSelected && tile.type === 'bomb' ? 'bomb' : null}
                hideTooltip={isMultiplayer}
                clearRotate={animState?.clearRotate}
                col={tile.col}
                fallOffset={animState?.fallDistance ? animState.fallDistance * cellHeight : undefined}
                spawnOffset={animState?.spawnOffset ? animState.spawnOffset * cellHeight : undefined}
              />
            );
          })}
        </div>
      )}
      {/* Layer 3: Single-tile info tooltip (mobile-friendly) */}
      {singleTileTooltip && (
        <div
          data-testid="blast-tile-tooltip"
          className="absolute left-1/2 -translate-x-1/2 z-30 px-3 py-1.5 rounded-neo bg-neo-navy/95 border border-neo-lime/40 shadow-hard-sm pointer-events-none animate-neo-pop"
          style={{
            top: `${(singleTileTooltip.row / gridSize) * 100}%`,
            transform: `translateX(-50%) translateY(${singleTileTooltip.row < 2 ? '110%' : '-110%'})`,
            maxWidth: '85%',
          }}
        >
          <span className="text-[0.7rem] font-neo-display text-neo-lime whitespace-nowrap">
            {singleTileTooltip.icon} {singleTileTooltip.name}
          </span>
          <span className="block text-[0.6rem] font-neo-body text-neo-white leading-tight">
            {singleTileTooltip.desc}
          </span>
        </div>
      )}
    </div>
  );
});

export default BlastBoard;
