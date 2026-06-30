import { shouldOfferBlastContinue, type BlastContinueOfferInput } from './blastContinueOffer';

/** Free revives a player gets per run before any ad is offered. */
export const BLAST_MAX_LIVES = 3;

export type BlastRecoverMode = 'free-revive' | 'ad-offer' | 'none';

export interface BlastRecoverInput extends BlastContinueOfferInput {
  /** Run-level lives left. While > 0 a dead-end is recovered for FREE. */
  livesRemaining: number;
}

/**
 * Decide how an out-of-moves dead-end recovers under the 3-lives model:
 *  - 'free-revive': lives remain → revive for free + consume a life, no ad.
 *  - 'ad-offer'   : lives exhausted → show the rewarded-ad continue modal.
 *  - 'none'       : not a recoverable dead-end, or the ad gate is closed.
 *
 * Free revive deliberately does NOT require an ad provider — lives are free.
 * The ad branch defers to shouldOfferBlastContinue so the existing one-shot /
 * declined / objective-met gates remain the single source of truth.
 */
export function resolveBlastRecover(input: BlastRecoverInput): BlastRecoverMode {
  const { livesRemaining, isDeadEnd, isMultiplayer, noWordsRemaining, objectiveAlreadyMet } = input;
  const canRecover = isDeadEnd && !isMultiplayer && !noWordsRemaining && !objectiveAlreadyMet;
  if (!canRecover) return 'none';
  if (livesRemaining > 0) return 'free-revive';
  return shouldOfferBlastContinue(input) ? 'ad-offer' : 'none';
}
