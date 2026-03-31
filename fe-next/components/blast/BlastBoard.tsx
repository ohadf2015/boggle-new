'use client';

import { useRef, useState, useEffect, useCallback, useMemo, memo } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTile } from './BlastTile';
import type { SelectedCell } from '@/components/grid';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState } from './types';
import type { SequencerState, TileAnimState } from './hooks/useBlastSequencer';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';
import { COMBO_ELIGIBLE_TILES } from './utils/blastCombos';

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
}: BlastBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

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
      className="blast-board relative w-full aspect-square max-w-[92vw] sm:max-w-[420px] md:max-w-[460px] lg:max-w-[min(500px,55vh)] overflow-hidden"
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
        hideWordPreview
        hideComboIndicator
        largeText
        language={language}
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

            // Skip rendering overlay for standard unselected tiles only when no animation active
            if (!animLookup && tile.type === 'standard' && !isSelected && !tile.isCleared) {
              return (
                <div
                  key={key}
                  className="aspect-square"
                />
              );
            }

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
                isNearMiss={nearMissSet.has(key)}
                activationEffect={tile.activationEffect}
                isComboPreview={comboPreviewSet?.has(key) ?? false}
                selectionIndex={selectionIndexMap.get(key)}
                selectionTotal={selectedCells.length}
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
