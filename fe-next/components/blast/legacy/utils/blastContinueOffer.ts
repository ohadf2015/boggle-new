export interface BlastContinueOfferInput {
  hasRealAdProvider: boolean;
  isMultiplayer: boolean;
  isDeadEnd: boolean;
  /** Board has no playable words remaining — extra moves can't help, so suppress the offer. */
  noWordsRemaining: boolean;
  hasUsedContinue: boolean;
  continueDeclined: boolean;
  /** Player has already cleared ≥ wave goal (default 90%) — wave will advance,
   *  so prompting for extra moves is noise. Suppress the offer. */
  objectiveAlreadyMet: boolean;
}

export function shouldOfferBlastContinue({
  hasRealAdProvider,
  isMultiplayer,
  isDeadEnd,
  noWordsRemaining,
  hasUsedContinue,
  continueDeclined,
  objectiveAlreadyMet,
}: BlastContinueOfferInput): boolean {
  return (
    hasRealAdProvider
    && !isMultiplayer
    && isDeadEnd
    && !noWordsRemaining
    && !hasUsedContinue
    && !continueDeclined
    && !objectiveAlreadyMet
  );
}
