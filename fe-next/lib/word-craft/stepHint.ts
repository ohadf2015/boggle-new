export type WordCraftStep = 'pick' | 'place' | 'submit' | 'bot' | 'over' | 'idle';

export interface WordCraftStepInput {
  /** Whose turn it is right now. */
  turn: 'player' | 'bot' | 'over';
  /** The rack tile the player has currently selected (null = none). */
  selectedTileId: string | null;
  /** How many tiles the player has staged on the board this turn. */
  pendingCount: number;
  /** Whether the player is allowed to act (dict loaded, not mid-handoff, etc.). */
  canInteract: boolean;
}

/**
 * Derives the single live coaching step shown to new players:
 *   pick → place → submit, plus bot/over/idle.
 *
 * This drives the (previously unused) WordCraftStepHint pill so the in-context
 * guidance updates as the player progresses, instead of a static one-shot strip.
 * Pure + exported so the state machine is unit-testable without the page.
 */
export function resolveWordCraftStep(input: WordCraftStepInput): WordCraftStep {
  if (input.turn === 'over') return 'over';
  if (input.turn === 'bot') return 'bot';
  if (!input.canInteract) return 'idle';
  if (input.pendingCount > 0) return 'submit';
  if (input.selectedTileId) return 'place';
  return 'pick';
}
