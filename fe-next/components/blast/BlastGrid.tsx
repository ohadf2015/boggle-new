'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTileOverlay } from './BlastTileOverlay';
import type { SelectedCell } from '@/components/grid';
import { BlastExplosionLayer } from './BlastExplosionLayer';
import { BlastCascadeOverlay } from './BlastCascadeOverlay';
import { BlastCascadeHighlight } from './BlastCascadeHighlight';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastExplosion, BlastScorePopup, CascadeHighlightData } from './types';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';
import { GRID_PADDING, GRID_GAP_CLASS } from '@/components/grid/gridLayoutConstants';

interface BlastGridProps {
  /** Modified grid (cleared cells are empty strings) */
  grid: LetterGrid;
  /** Tile states for overlay rendering */
  tileStates: BlastTileState[][];
  /** Grid dimensions */
  gridSize: number;
  /** Active explosions */
  explosions: BlastExplosion[];
  /** Game language */
  language: Language;
  /** Whether grid is interactive */
  interactive: boolean;
  /** Combo level for grid visual effects */
  comboLevel: number;
  /** Cascade animation state */
  cascadePhase: BlastCascadePhase;
  /** Cascade animation data */
  cascadeAnimationData: CascadeAnimationData | null;
  /** Cascade highlight data (words being showcased before clearing) */
  cascadeHighlightData: CascadeHighlightData | null;
  /** Score popups from useBlastGame */
  scorePopups: BlastScorePopup[];
  /** Callbacks */
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  onExplosionComplete: (id: string) => void;
  onScorePopupComplete: (id: string) => void;
  /** Accessibility label for grid */
  ariaLabel?: string;
  /** Optional highlighted path (for hints/tutorials) */
  highlightedPath?: Array<{ row: number; col: number }>;
  /** Cells to render with near-miss shimmer pulse (empty = none) */
  shimmerCells?: Array<{ row: number; col: number }>;
  /** Tile types matching current wave objectives — highlighted with pulsing outline */
  objectiveTileTypes?: Set<string>;
}

/**
 * BlastGrid - Wraps GridComponent with blast-specific overlays.
 *
 * Layers (bottom to top):
 * 1. GridComponent — proven word input mechanics
 * 2. BlastTileOverlay — special tile full-cell backgrounds
 * 3. BlastCascadeOverlay — gravity/refill animations (anime.js)
 * 4. BlastExplosionLayer — particle effects
 */
export function BlastGrid({
  grid,
  tileStates,
  gridSize,
  explosions,
  language,
  interactive,
  comboLevel,
  cascadePhase,
  cascadeAnimationData,
  cascadeHighlightData,
  scorePopups,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onExplosionComplete,
  onScorePopupComplete,
  ariaLabel,
  highlightedPath = [],
  shimmerCells = [],
  objectiveTileTypes,
}: BlastGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container for overlay positioning
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(el);
    setContainerWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const cellSize = containerWidth / gridSize;

  // Block interaction during cascade
  const isInteractive = interactive && cascadePhase === 'idle';

  // Track selected cells for overlay selection glow
  const [selectedCells, setSelectedCells] = useState<SelectedCell[]>([]);
  const handleSelectionChange = useCallback((cells: SelectedCell[]) => {
    setSelectedCells(cells);
  }, []);
  const selectedPositions = useMemo(
    () => new Set(selectedCells.map(c => `${c.row}-${c.col}`)),
    [selectedCells],
  );

  return (
    <div
      ref={containerRef}
      className="blast-game blast-grid-frame relative w-full aspect-square max-w-[360px]"
      style={{ contain: 'layout paint' }}
      data-cascade={cascadePhase !== 'idle' ? 'active' : 'idle'}
      aria-label={ariaLabel}
    >
      {/* Base grid - proven word input */}
      <GridComponent
        grid={grid}
        interactive={isInteractive}
        onWordSubmit={onWordSubmit}
        onPathSubmit={onPathSubmit}
        onWordChange={onWordChange}
        onSelectionChange={handleSelectionChange}
        hideWordPreview
        hideComboIndicator
        comboLevel={comboLevel}
        largeText
        highlightedPath={highlightedPath}
        language={language}
      />

      {/* Special tile full-cell backgrounds with selection glow */}
      <BlastTileOverlay
        tileStates={tileStates}
        gridSize={gridSize}
        selectedPositions={selectedPositions}
        objectiveTileTypes={objectiveTileTypes}
      />

      {/* Near-miss shimmer: pulse overlay on cells the player almost used */}
      {shimmerCells.length > 0 && (
        <div
          dir="ltr"
          className={`absolute inset-0 pointer-events-none z-[13] grid ${GRID_GAP_CLASS}`}
          style={{
            padding: GRID_PADDING,
            gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${gridSize}, minmax(0, 1fr))`,
          }}
        >
          {shimmerCells.map(cell => (
            <div
              key={`shimmer-${cell.row}-${cell.col}`}
              className="near-miss-pulse rounded"
              style={{
                gridRow: cell.row + 1,
                gridColumn: cell.col + 1,
                border: '2px solid rgba(255, 225, 53, 0.85)',
                boxShadow: '0 0 8px rgba(255, 225, 53, 0.6), inset 0 0 8px rgba(255, 225, 53, 0.2)',
                animation: 'nearMissPulse 1.5s ease-out forwards',
              }}
            />
          ))}
        </div>
      )}

      {/* Cascade word highlight glow (z-15, between tile overlay and cascade overlay) */}
      {cascadeHighlightData && (
        <BlastCascadeHighlight
          highlightData={cascadeHighlightData}
          gridSize={gridSize}
        />
      )}

      {/* Cascade gravity/refill animations */}
      {cascadePhase !== 'idle' && (
        <BlastCascadeOverlay
          phase={cascadePhase}
          data={cascadeAnimationData}
          gridSize={gridSize}
        />
      )}

      {/* Explosion particles + score popups */}
      {containerWidth > 0 && (
        <BlastExplosionLayer
          explosions={explosions}
          scorePopups={scorePopups}
          onExplosionComplete={onExplosionComplete}
          onScorePopupComplete={onScorePopupComplete}
          cellSize={cellSize}
          containerOffset={{ x: 0, y: 0 }}
        />
      )}
    </div>
  );
}
