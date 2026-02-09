'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import GridComponent from '@/components/GridComponent';
import { BlastTileOverlay } from './BlastTileOverlay';
import { BlastExplosionLayer } from './BlastExplosionLayer';
import type { LetterGrid, Language } from '@/shared/types/game';
import type { BlastTileState, BlastExplosion, BlastScorePopup } from './types';

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
  /** Callbacks */
  onWordSubmit: (word: string) => void;
  onPathSubmit: (cells: Array<{ row: number; col: number }>) => void;
  onWordChange: (word: string, count: number) => void;
  onExplosionComplete: (id: string) => void;
  /** Optional highlighted path (for hints/tutorials) */
  highlightedPath?: Array<{ row: number; col: number }>;
}

/**
 * BlastGrid - Wraps GridComponent with blast-specific overlays.
 *
 * Layers (bottom to top):
 * 1. GridComponent — proven word input mechanics
 * 2. BlastTileOverlay — special tile badges + clear animations
 * 3. BlastExplosionLayer — particle effects
 */
export function BlastGrid({
  grid,
  tileStates,
  gridSize,
  explosions,
  language,
  interactive,
  comboLevel,
  onWordSubmit,
  onPathSubmit,
  onWordChange,
  onExplosionComplete,
  highlightedPath = [],
}: BlastGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [scorePopups, setScorePopups] = useState<BlastScorePopup[]>([]);

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
    // Initial measurement
    setContainerWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, []);

  const handleScorePopupComplete = useCallback((id: string) => {
    setScorePopups(prev => prev.filter(p => p.id !== id));
  }, []);

  const cellSize = containerWidth / gridSize;

  return (
    <div ref={containerRef} className="relative w-full aspect-square max-w-[360px]">
      {/* Base grid - proven word input */}
      <GridComponent
        grid={grid}
        interactive={interactive}
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

      {/* Special tile badges + cleared cell overlays */}
      {containerWidth > 0 && (
        <BlastTileOverlay
          tileStates={tileStates}
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
          onScorePopupComplete={handleScorePopupComplete}
          cellSize={cellSize}
          containerOffset={{ x: 0, y: 0 }}
        />
      )}
    </div>
  );
}
