import type { GameState } from '@/lib/crossword/gameState';
import { solvedSlotIds } from '@/lib/crossword/stats';
import type { Slot } from '@/lib/crossword/types';

// Crossword words land slower than Boggle words, so the chain window is wider than Word Wheel's.
export const CROSSWORD_COMBO_WINDOW_MS = 12_000;

/** Slots solved since `prev`, minus any finished by a reveal hint. `prev === null` is the first look. */
export function freshSolvedSlots(prev: ReadonlySet<string> | null, state: GameState): Slot[] {
  if (prev === null) return [];
  const revealed = new Set(state.revealed);
  const fresh: Slot[] = [];
  for (const id of solvedSlotIds(state)) {
    if (prev.has(id)) continue;
    const slot = state.puzzle.slots.find((s) => s.id === id);
    if (!slot || slot.cells.some((c) => revealed.has(`${c.row},${c.col}`))) continue;
    fresh.push(slot);
  }
  return fresh;
}

export function nextComboChain(chain: number, lastAt: number, now: number, windowMs = CROSSWORD_COMBO_WINDOW_MS): number {
  return chain > 0 && now - lastAt <= windowMs ? chain + 1 : 1;
}

export interface ComboPunch {
  /** Peak horizontal squash factor of the impact frame. */
  squash: number;
  /** Seconds the overshoot freezes before settling. */
  hold: number;
  particles: number;
  bursts: number;
}

const PUNCH_CAP = 6;

/** Slapstick escalation: every link in the chain hits harder and freezes longer, capped at 6. */
export function comboPunch(chain: number): ComboPunch {
  const n = Math.max(1, Math.min(chain, PUNCH_CAP));
  return {
    squash: 1.2 + 0.07 * n,
    hold: 0.06 + 0.02 * n,
    particles: 14 + 8 * n,
    bursts: n >= 4 ? 2 : 1,
  };
}
