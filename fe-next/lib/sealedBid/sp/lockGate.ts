/**
 * Pure lock-bid gate for sealed-bid solo UI.
 * Keeps presentation and settle logic decoupled — UI reads these for
 * disabled CTA + reason copy without re-implementing rules.
 */

export type LockDisabledReason = 'needWord' | 'needStake' | 'pending' | 'busted' | null;

export interface LockGateInput {
  word: string;
  stake: number;
  pending?: boolean;
  busted?: boolean;
  minWordLength?: number;
}

export function canLockBid(input: LockGateInput): boolean {
  return lockDisabledReason(input) === null;
}

export function lockDisabledReason(input: LockGateInput): LockDisabledReason {
  const minLen = input.minWordLength ?? 3;
  if (input.busted) return 'busted';
  if (input.pending) return 'pending';
  if (!input.word || input.word.length < minLen) return 'needWord';
  if (input.stake <= 0) return 'needStake';
  return null;
}
