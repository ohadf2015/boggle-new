'use client';

import { useEffect, useRef, useState } from 'react';
import type { useWordCraftGame } from '@/lib/word-craft/useWordCraftGame';
import type { SceneCtx } from '@/lib/word-craft/pixi/sceneCtx';
import type { useWordCraftJuice } from '@/components/word-craft/useWordCraftJuice';
import { playTilePlaceRipple } from '@/lib/word-craft/pixi/scenes/tilePlaceRipple';
import { emitWordCraftMove } from '@/components/word-craft/wordCraftTelemetry';

export interface CaptureToast {
  by: 'player' | 'bot';
  count: number;
  bonus: number;
  key: number;
}

interface Args {
  game: ReturnType<typeof useWordCraftGame>;
  juice: ReturnType<typeof useWordCraftJuice>;
  sceneCtx: SceneCtx | null;
  hotseat: boolean;
}

/** Board-side juice that reacts to game state: capture burst + toast, tile place, rack select, invalid shake, move emitter. */
export function useWordCraftBoardEffects({ game, juice, sceneCtx, hotseat }: Args): CaptureToast | null {
  // Capture toast — fires when a turn flips opponent-claimed cells.
  // turnIndex is monotonic so a fresh capture always triggers re-render.
  const [captureToast, setCaptureToast] = useState<CaptureToast | null>(null);
  const lastCaptureTurnRef = useRef<number>(-1);
  useEffect(() => {
    const cap = game.state.lastCapture;
    if (!cap) return;
    if (cap.turnIndex === lastCaptureTurnRef.current) return;
    lastCaptureTurnRef.current = cap.turnIndex;
    setCaptureToast({ by: cap.by, count: cap.cells.length, bonus: cap.bonus, key: cap.turnIndex });
    // Burst the flipped cells in the capturer's color — cyan when you take
    // ground, pink when the bot takes yours.
    if (typeof document !== 'undefined') {
      const color = cap.by === 'player' ? '#00FFFF' : '#FF1493';
      const cellEls = cap.cells.map((c) => document.querySelector(`[data-board-cell="${c.row},${c.col}"]`));
      requestAnimationFrame(() => juice.captureBurst(cellEls, color));
    }
    if (cap.by === 'bot' && cap.cells.length >= 2) juice.boardImpact(document.querySelector('[data-wc-board]'), 2);
    const timer = setTimeout(() => setCaptureToast(null), 1800);
    return () => clearTimeout(timer);
  }, [game.state.lastCapture, juice]);

  // --- Juice: tile place ---
  const prevPendingIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const next = new Set(game.state.pendingPlacements.map((p) => p.rackTileId));
    for (const p of game.state.pendingPlacements) {
      if (!prevPendingIdsRef.current.has(p.rackTileId)) {
        const el = document.querySelector(`[data-tile-id="${p.rackTileId}"]`);
        juice.tilePlace(el);
        // Fire Pixi ripple at the cell where the tile was placed
        if (sceneCtx) {
          playTilePlaceRipple(sceneCtx, { row: p.row, col: p.col }).catch(() => {
            // Pixi animations can fail on low-end devices; silently continue
          });
        }
      }
    }
    prevPendingIdsRef.current = next;
  }, [game.state.pendingPlacements, juice, sceneCtx]);

  // --- Juice: rack select ---
  const prevSelectedRef = useRef<string | null>(null);
  useEffect(() => {
    const id = game.state.selectedRackTileId;
    if (id && id !== prevSelectedRef.current) {
      const el = document.querySelector(`[data-rack-tile-id="${id}"]`);
      juice.rackSelect(el);
    }
    prevSelectedRef.current = id;
  }, [game.state.selectedRackTileId, juice]);

  const emittedMovesRef = useRef(0);
  useEffect(() => {
    const history = game.state.history;
    if (history.length < emittedMovesRef.current) emittedMovesRef.current = 0;
    for (let i = emittedMovesRef.current; i < history.length; i++) {
      const { who, words, score } = history[i];
      emitWordCraftMove({ who, words, score }, { hotseat });
    }
    emittedMovesRef.current = history.length;
  }, [game.state.history, hotseat]);

  // --- Error shake ---
  const lastErrorRef = useRef<string | null>(null);
  useEffect(() => {
    const e = game.state.lastError;
    if (!e || e === lastErrorRef.current) {
      lastErrorRef.current = e;
      return;
    }
    lastErrorRef.current = e;
    const cellEls = game.state.pendingPlacements
      .map((p) => document.querySelector(`[data-tile-id="${p.rackTileId}"]`))
      .filter((n): n is Element => Boolean(n));
    juice.invalidShake(cellEls);
  }, [game.state.lastError, game.state.pendingPlacements, juice]);

  return captureToast;
}
