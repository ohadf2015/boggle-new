import { useLayoutEffect, type RefObject } from 'react';
import type { HuntCell } from './huntStage';

/** The board stamp plays first; letters leave their tiles once it peaks. */
export const FLIGHT_START_MS = 240;
const FLIGHT_MS = 340;
const FLIGHT_BUDGET_MS = 700;
const MAX_STAGGER_MS = 30;

export function flightDelays(n: number): number[] {
  const room = FLIGHT_BUDGET_MS - FLIGHT_START_MS - FLIGHT_MS;
  const step = n > 1 ? Math.min(MAX_STAGGER_MS, room / (n - 1)) : 0;
  return Array.from({ length: n }, (_, i) => Math.round(FLIGHT_START_MS + i * step));
}

/**
 * Flies each answer letter from the board tile it was swiped on to its slot. Rects are read once,
 * at mount; the motion is transform/opacity only.
 */
export function useLetterFlight(
  rowRef: RefObject<HTMLElement | null>,
  path: HuntCell[] | undefined,
  enabled: boolean,
) {
  useLayoutEffect(() => {
    const row = rowRef.current;
    const scope = row?.closest('[data-testid="hunt-finish"]')?.parentElement;
    if (!enabled || !row || !scope || !path?.length) return undefined;
    const letters = [...row.querySelectorAll<HTMLElement>('[data-testid="hunt-finish-letter"]')];
    if (letters.length !== path.length || typeof letters[0].animate !== 'function') return undefined;
    const tiles = path.map((c) => scope.querySelector<HTMLElement>(`[data-tile][data-row="${c.row}"][data-col="${c.col}"]`));
    if (tiles.some((tile) => !tile)) return undefined;
    const delays = flightDelays(letters.length);
    const anims = letters.map((el, i) => {
      const from = tiles[i]!.getBoundingClientRect();
      const to = el.getBoundingClientRect();
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      const s = to.width > 0 ? from.width / to.width : 1;
      return el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px) scale(${s})`, opacity: 0 },
          { opacity: 1, offset: 0.2 },
          { transform: 'translate(0, -10px) scale(1.12)', opacity: 1, offset: 0.75 },
          { transform: 'none', opacity: 1 },
        ],
        { duration: FLIGHT_MS, delay: delays[i], easing: 'cubic-bezier(0.3, 0.9, 0.3, 1)', fill: 'backwards' },
      );
    });
    return () => anims.forEach((a) => a.cancel());
    // Plays once per finish; the path is fixed by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
