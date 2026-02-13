'use client';

import { useRef, useState, useEffect } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTileOverlay } from './BlastTileOverlay';
import { BlastExplosionLayer } from './BlastExplosionLayer';
import { BlastCascadeOverlay } from './BlastCascadeOverlay';
import { BlastCascadeHighlight } from './BlastCascadeHighlight';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastExplosion, BlastScorePopup, CascadeHighlightData } from './types';
import type { BlastCascadePhase, CascadeAnimationData } from './hooks/useBlastCascade';

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

  return (
    <div
      ref={containerRef}
      className="blast-game blast-grid-frame relative w-full aspect-square max-w-[360px]"
      aria-label={ariaLabel}
    >
      {/* Base grid - proven word input */}
      <GridComponent
        grid={grid}
        interactive={isInteractive}
        onWordSubmit={onWordSubmit}
        onPathSubmit={onPathSubmit}
        onWordChange={onWordChange}
        hideWordPreview
        hideComboIndicator
        comboLevel={comboLevel}
        largeText
        highlightedPath={highlightedPath}
        language={language}
      />

      {/* Special tile full-cell backgrounds (below letters) */}
      {containerWidth > 0 && (
        <BlastTileOverlay
          tileStates={tileStates}
          gridSize={gridSize}
          containerWidth={containerWidth}
        />
      )}

      {/* Cascade word highlight glow (z-15, between tile overlay and cascade overlay) */}
      {containerWidth > 0 && cascadeHighlightData && (
        <BlastCascadeHighlight
          highlightData={cascadeHighlightData}
          gridSize={gridSize}
          cellSize={cellSize}
        />
      )}

      {/* Cascade gravity/refill animations */}
      {containerWidth > 0 && cascadePhase !== 'idle' && (
        <BlastCascadeOverlay
          phase={cascadePhase}
          data={cascadeAnimationData}
          gridSize={gridSize}
          containerWidth={containerWidth}
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
