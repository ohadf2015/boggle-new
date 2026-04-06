'use client';

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTile } from './BlastTile';
import type { SelectedCell } from '@/components/grid';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastTileType } from './types';
import type { SequencerState, TileAnimState } from './hooks/useBlastSequencer';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';
import { COMBO_ELIGIBLE_TILES } from './utils/blastCombos';
import { computeCellFilter } from './hooks/blastCellFilterLogic';

const ZONE_PREVIEW_TILES: Partial<Record<BlastTileType, 'bomb' | 'lightning' | 'prism' | 'magnet'>> = {
  bomb: 'bomb',
  lightning: 'lightning',
  prism: 'prism',
  magnet: 'magnet',
};

function getZonePreview(type: BlastTileType): 'bomb' | 'lightning' | 'prism' | 'magnet' | null {
  return ZONE_PREVIEW_TILES[type] ?? null;
}

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
  /** Remaining turns of diamond reveal (shows frozen tile inner types) */
  diamondRevealTurns?: number;
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
  diamondRevealTurns = 0,
}: BlastBoardProps) {
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

  // Cell filter: gates selectability based on tile type (ice, gem, etc.)
  const cellFilter = useMemo(
    () => computeCellFilter(tileStates, selectedCells),
    [tileStates, selectedCells],
  );

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

  // Only render overlay once we have tile states
  const hasTileStates = tileStates.length > 0 && tileStates[0]?.length > 0;

  return (
    <div
      ref={containerRef}
      className="blast-board relative w-full aspect-square overflow-hidden"
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
        cellFilter={cellFilter}
        hideWordPreview
        hideComboIndicator
        largeText
        language={language}
        ghostCells
      />

      {/* Layer 2: Blast tile type overlay — indicators, special backgrounds, selection glow */}
      {hasTileStates && containerWidth > 0 && (
        <div
          dir="ltr"
          className={`absolute inset-0 pointer-events-none z-[10] grid ${GRID_GAP_CLASS}`}
          style={{
            padding: GRID_PADDING,
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
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
                hitsRemaining={tile.hitsRemaining}
                countdown={tile.countdown}
                isNearMiss={nearMissSet.has(key)}
                activationEffect={tile.activationEffect}
                isComboPreview={comboPreviewSet?.has(key) ?? false}
                selectionIndex={selectionIndexMap.get(key)}
                selectionTotal={selectedCells.length}
                isLocked={!cellFilter(tile.row, tile.col) && !tile.isCleared}
                isCascadeHighlight={cascadeHighlightSet.has(key)}
                zonePreview={isSelected ? getZonePreview(tile.type) : null}
                isDiamondRevealed={tile.type === 'frozen' && diamondRevealTurns > 0 && tile.innerType != null}
                innerType={tile.innerType}
                clearRotate={animState?.clearRotate}
                fallOffset={animState?.fallDistance ? animState.fallDistance * cellHeight : undefined}
                spawnOffset={animState?.spawnOffset ? animState.spawnOffset * cellHeight : undefined}
              />
            );
          })}
        </div>
      )}
    </div>
  );
});

export default BlastBoard;
