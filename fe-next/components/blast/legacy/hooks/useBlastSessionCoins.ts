'use client';

import { useCallback, useRef, useState } from 'react';
import { emitCoinEarned } from '@/utils/coinEarnedFx';

type Cell = { row: number; col: number };

const MIN_FLYING_COINS = 4;
const MAX_FLYING_COINS = 9;
const BIG_WORD_LETTERS = 5;
const BIG_WORD_COINS = 12;

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
 * through CoinContext.addCoins — nothing here grants coins. The wallet shows a
 * word's estimate while its coins fly and never rolls back down on an earn.
 */
export function useBlastSessionCoins({ isMultiplayer, gridSize }: { isMultiplayer: boolean; gridSize: number }) {
  const [coins, setCoins] = useState({ session: 0, wallet: 0 });
  const launched = useRef<{ path: Cell[]; estimate: number } | null>(null);

  const launchCoins = useCallback(
    (path: Cell[], estimate: number) => {
      if (isMultiplayer || path.length === 0 || !(estimate > 0)) return;
      const big = path.length >= BIG_WORD_LETTERS;
      const count = big ? BIG_WORD_COINS : Math.min(MAX_FLYING_COINS, Math.max(MIN_FLYING_COINS, path.length + 1));
      launched.current = { path, estimate };
      setCoins((c) => ({ ...c, wallet: Math.max(c.wallet, c.session + estimate) }));
      emitCoinEarned(estimate, wordCentre(path, gridSize), { inline: true, coins: count, ...(big ? { big } : {}) });
    },
    [isMultiplayer, gridSize],
  );

  const creditCoins = useCallback(
    (delta: number) => {
      if (isMultiplayer) return;
      const word = launched.current;
      launched.current = null;
      if (!(delta > 0)) return;
      setCoins((c) => ({ session: c.session + delta, wallet: Math.max(c.wallet, c.session + delta) }));
      const extra = delta - (word?.estimate ?? 0);
      if (word && extra > 0) {
        const count = Math.min(MAX_FLYING_COINS, MIN_FLYING_COINS + Math.floor(extra / 5));
        emitCoinEarned(extra, wordCentre(word.path, gridSize), { inline: true, coins: count });
      }
    },
    [isMultiplayer, gridSize],
  );

  return { sessionCoins: coins.session, walletCoins: coins.wallet, launchCoins, creditCoins };
}
