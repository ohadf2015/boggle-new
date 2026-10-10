'use client';

import { useCallback, useState } from 'react';
import { emitCoinEarned } from '@/utils/coinEarnedFx';

type Cell = { row: number; col: number };

const MIN_FLYING_COINS = 4;
const MAX_FLYING_COINS = 9;

/** Viewport centre of a word's tiles, from the board's on-screen rect. */
function wordCentre(path: Cell[], gridSize: number): { x: number; y: number } | undefined {
  const board = document.querySelector<HTMLElement>('[data-blast-board="true"]');
  if (!board || path.length === 0) return undefined;
  const r = board.getBoundingClientRect();
  const row = path.reduce((s, p) => s + p.row, 0) / path.length;
  const col = path.reduce((s, p) => s + p.col, 0) / path.length;
  return {
    x: r.left + ((col + 0.5) / gridSize) * r.width,
    y: r.top + ((row + 0.5) / gridSize) * r.height,
  };
}

/**
 * Single-player run coins. Visual only: the run total is banked once at wave end
 * through CoinContext.addCoins — nothing here grants coins.
 */
export function useBlastSessionCoins({ isMultiplayer, gridSize }: { isMultiplayer: boolean; gridSize: number }) {
  const [sessionCoins, setSessionCoins] = useState(0);

  const launchCoins = useCallback(
    (path: Cell[]) => {
      if (isMultiplayer || path.length === 0) return;
      const coins = Math.min(MAX_FLYING_COINS, Math.max(MIN_FLYING_COINS, path.length + 1));
      emitCoinEarned(path.length, wordCentre(path, gridSize), { inline: true, coins });
    },
    [isMultiplayer, gridSize],
  );

  const creditCoins = useCallback(
    (delta: number) => {
      if (isMultiplayer || !(delta > 0)) return;
      setSessionCoins((c) => c + delta);
    },
    [isMultiplayer],
  );

  return { sessionCoins, launchCoins, creditCoins };
}
