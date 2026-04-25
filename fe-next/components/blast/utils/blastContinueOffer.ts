export interface BlastContinueOfferInput {
  hasRealAdProvider: boolean;
  isMultiplayer: boolean;
  isDeadEnd: boolean;
  /** Board has no playable words remaining — extra moves can't help, so suppress the offer. */
  noWordsRemaining: boolean;
  hasUsedContinue: boolean;
  continueDeclined: boolean;
}

export function shouldOfferBlastContinue({
  hasRealAdProvider,
  isMultiplayer,
  isDeadEnd,
  noWordsRemaining,
  hasUsedContinue,
  continueDeclined,
}: BlastContinueOfferInput): boolean {
  return (
    hasRealAdProvider
    && !isMultiplayer
    && isDeadEnd
    && !noWordsRemaining
    && !hasUsedContinue
    && !continueDeclined
  );
}
