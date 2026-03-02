/**
 * useBlastBridge — translates React blast state ↔ GameBridge events.
 *
 * Responsibilities:
 *   1. Sync grid/tileStates/comboLevel → blast:grid:update
 *   2. Sync hintPath → blast:hint:show / blast:hint:clear
 *   3. Listen for word:submit from Phaser → forward to React callback
 *   4. Listen for word:change from Phaser → forward to React callback
 *   5. Listen for blast:anim:complete → forward to React callback
 *   6. Listen for scene:ready → resend initial grid state
 *   7. Expose emitBlastEvent() for imperative blast event emission
 *   8. Clean up on unmount (scene:destroy + GameBridge.reset)
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GameBridge, type BridgeEvents, type PathCellPayload } from '@/lib/phaser/bridge/GameBridge';
import type { BlastTileState } from '../types';

// ─── Blast-specific bridge event keys ────────────────────────────────────────

type BlastEmitEvent =
  | 'blast:tiles:clear'
  | 'blast:gravity:start'
  | 'blast:cascade:highlight'
  | 'blast:cascade:clear'
  | 'blast:shake'
  | 'blast:wave:transition';

// ─── Options ─────────────────────────────────────────────────────────────────

export interface UseBlastBridgeOptions {
  /** Current letter grid (null while loading) */
  grid: string[][] | null;
  /** Current tile states */
  tileStates: BlastTileState[][];
  /** Current combo multiplier level */
  comboLevel: number;
  /** Hint path to highlight (null = no hint) */
  hintPath: Array<{ row: number; col: number }> | null;
  /** Current wave number */
  waveNumber: number;
  /** Called when Phaser emits a completed word path */
  onWordSubmit?: (word: string, path: PathCellPayload[]) => void;
  /** Called on every drag step (live word preview) */
  onWordChange?: (word: string, letterCount: number) => void;
  /** Called when a blast animation phase completes */
  onAnimComplete?: (phase: string) => void;
}

export interface UseBlastBridgeReturn {
  /** Emit a blast-specific bridge event imperatively */
  emitBlastEvent: <K extends BlastEmitEvent>(event: K, payload: BridgeEvents[K]) => void;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useBlastBridge({
  grid,
  tileStates,
  comboLevel,
  hintPath,
  // waveNumber consumed by parent for emitBlastEvent('blast:wave:transition')
  waveNumber: _waveNumber,
  onWordSubmit,
  onWordChange,
  onAnimComplete,
}: UseBlastBridgeOptions): UseBlastBridgeReturn {

  // Ref holds latest grid values so scene:ready handler always sends fresh data
  const gridStateRef = useRef({ grid, tileStates, comboLevel });
  gridStateRef.current = { grid, tileStates, comboLevel };

  // ── React → Phaser: blast:grid:update ────────────────────────────────────
  useEffect(() => {
    if (!grid) return;
    GameBridge.emit('blast:grid:update', { grid, tileStates, comboLevel });
  }, [grid, tileStates, comboLevel]);

  // ── React → Phaser: hint path ────────────────────────────────────────────
  useEffect(() => {
    if (hintPath && hintPath.length > 0) {
      GameBridge.emit('blast:hint:show', { path: hintPath });
    } else {
      GameBridge.emit('blast:hint:clear', undefined);
    }
  }, [hintPath]);

  // ── Wait for scene boot, then send initial grid ──────────────────────────
  useEffect(() => {
    return GameBridge.on('scene:ready', () => {
      const { grid: g, tileStates: ts, comboLevel: cl } = gridStateRef.current;
      if (g) {
        GameBridge.emit('blast:grid:update', { grid: g, tileStates: ts, comboLevel: cl });
      }
    });
  }, []);

  // ── Phaser → React: word:submit ──────────────────────────────────────────
  useEffect(() => {
    if (!onWordSubmit) return;
    return GameBridge.on('word:submit', ({ word, path }) => {
      onWordSubmit(word, path);
    });
  }, [onWordSubmit]);

  // ── Phaser → React: word:change ──────────────────────────────────────────
  useEffect(() => {
    if (!onWordChange) return;
    return GameBridge.on('word:change', ({ word, letterCount }) => {
      onWordChange(word, letterCount);
    });
  }, [onWordChange]);

  // ── Phaser → React: blast:anim:complete ──────────────────────────────────
  useEffect(() => {
    if (!onAnimComplete) return;
    return GameBridge.on('blast:anim:complete', ({ phase }) => {
      onAnimComplete(phase);
    });
  }, [onAnimComplete]);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      GameBridge.emit('scene:destroy', undefined);
      GameBridge.reset();
    };
  }, []);

  // ── Imperative blast event emitter ───────────────────────────────────────
  const emitBlastEvent = useCallback(<K extends BlastEmitEvent>(
    event: K,
    payload: BridgeEvents[K],
  ) => {
    GameBridge.emit(event, payload);
  }, []);

  return { emitBlastEvent };
}
