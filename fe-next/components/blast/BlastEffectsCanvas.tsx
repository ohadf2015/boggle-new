'use client';

/**
 * BlastEffectsCanvas — Hybrid PixiJS effects layer behind DOM tiles.
 *
 * Architecture: GameCanvas (transparent PixiJS) renders particles, screen shake,
 * and ambient effects BEHIND the existing DOM BlastBoard (passed as children).
 * All touch interaction stays on the DOM layer — zero changes to GridComponent.
 *
 * Dynamically imported (ssr: false) to keep PixiJS out of SSR bundle.
 */

import { useEffect, useRef, type ReactNode } from 'react';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import {
  TILE_EXPLOSION,
  BOMB_EXPLOSION,
  LIGHTNING_SPARK,
  PRISM_CROSS,
  GEM_SHATTER,
  VORTEX_PULL,
  COMBO_FLASH,
  CASCADE_SPARKLE,
  BOARD_CLEAR,
  AMBIENT_BOKEH,
} from '@/lib/gameEngine/presets/particles';
import type { ParticleConfig } from '@/lib/gameEngine/types';
import type { BlastTileType } from './types';

// ─── Types ──────────────────────────────────────────────────────────────

export interface ClearedTileEvent {
  row: number;
  col: number;
  type: BlastTileType;
}

interface BlastEffectsCanvasProps {
  width: number;
  height: number;
  gridSize: number;
  clearedTiles: ClearedTileEvent[];
  chainLevel: number;
  comboTier: number;
  waveCleared: boolean;
  children: ReactNode;
}

// ─── Tile-type → particle preset map ────────────────────────────────────

const CLEAR_PRESET_MAP: Partial<Record<BlastTileType, ParticleConfig>> = {
  bomb: BOMB_EXPLOSION,
  lightning: LIGHTNING_SPARK,
  prism: PRISM_CROSS,
  gem: GEM_SHATTER,
  magnet: VORTEX_PULL,
};

// ─── Main Component ─────────────────────────────────────────────────────

export function BlastEffectsCanvas({
  width,
  height,
  gridSize,
  clearedTiles,
  chainLevel,
  comboTier,
  waveCleared,
  children,
}: BlastEffectsCanvasProps) {
  if (width <= 0 || height <= 0) return <>{children}</>;

  return (
    <div className="relative" style={{ width, height }}>
      <GameCanvas
        config={{
          width: Math.round(width),
          height: Math.round(height),
          background: 0x1a1a2e, // match bg-neo-navy
          antialias: true,
        }}
        className="!absolute inset-0 rounded-lg"
      >
        <EffectsWorker
          width={width}
          height={height}
          gridSize={gridSize}
          clearedTiles={clearedTiles}
          chainLevel={chainLevel}
          comboTier={comboTier}
          waveCleared={waveCleared}
        />
      </GameCanvas>
      {/* DOM children (BlastBoard) rendered above the canvas */}
      <div className="absolute inset-0 z-10" style={{ pointerEvents: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Effects Worker (runs inside GameCanvas context) ─────────────────

interface EffectsWorkerProps {
  width: number;
  height: number;
  gridSize: number;
  clearedTiles: ClearedTileEvent[];
  chainLevel: number;
  comboTier: number;
  waveCleared: boolean;
}

function EffectsWorker({
  width,
  height,
  gridSize,
  clearedTiles,
  chainLevel,
  comboTier,
  waveCleared,
}: EffectsWorkerProps) {
  const { particles, shake } = useGameEngine();

  const prevClearedKeyRef = useRef('');
  const prevChainRef = useRef(0);
  const prevComboRef = useRef(0);
  const prevWaveRef = useRef(false);

  const cellSize = width / gridSize;

  // Start ambient bokeh on mount
  useEffect(() => {
    const emitter = particles.create(AMBIENT_BOKEH);
    emitter.emit(width / 2, height / 2);
    return () => { emitter.destroy(); };
  }, [particles, width, height]);

  // Tile clear → per-type particle bursts + screen shake
  useEffect(() => {
    if (clearedTiles.length === 0) return;
    const key = clearedTiles.map(t => `${t.row},${t.col},${t.type}`).join(';');
    if (key === prevClearedKeyRef.current) return;
    prevClearedKeyRef.current = key;

    for (const tile of clearedTiles) {
      const x = tile.col * cellSize + cellSize / 2;
      const y = tile.row * cellSize + cellSize / 2;
      const preset = CLEAR_PRESET_MAP[tile.type] ?? TILE_EXPLOSION;
      particles.burst(preset, x, y);
    }

    // Screen shake scaled to clear count
    const count = clearedTiles.length;
    if (count >= 6) shake.heavy();
    else if (count >= 3) shake.medium();
    else shake.light();
  }, [clearedTiles, particles, shake, cellSize]);

  // Chain cascade sparkle
  useEffect(() => {
    if (chainLevel > prevChainRef.current && chainLevel >= 1) {
      particles.burst(CASCADE_SPARKLE, width / 2, height * 0.7, chainLevel * 5);
      if (chainLevel >= 3) shake.medium();
      else shake.light();
    }
    prevChainRef.current = chainLevel;
  }, [chainLevel, particles, shake, width, height]);

  // Combo flash particles
  useEffect(() => {
    if (comboTier > prevComboRef.current && comboTier >= 1) {
      particles.burst(COMBO_FLASH, width / 2, height / 2, comboTier * 15);
      shake.shake({
        intensity: comboTier * 4,
        duration: 0.2 + comboTier * 0.1,
        decay: 'exponential',
      });
    }
    prevComboRef.current = comboTier;
  }, [comboTier, particles, shake, width, height]);

  // Wave clear celebration
  useEffect(() => {
    if (waveCleared && !prevWaveRef.current) {
      particles.burst(BOARD_CLEAR, width / 2, height / 2);
      shake.heavy();
    }
    prevWaveRef.current = waveCleared;
  }, [waveCleared, particles, shake, width, height]);

  return null;
}

export default BlastEffectsCanvas;
