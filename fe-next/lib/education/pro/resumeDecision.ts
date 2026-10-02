export type ResumeDecision =
  | 'wait'
  | 'checkout-trial'
  | 'checkout-paid'
  | 'trial-used'
  | 'already-pro'
  | 'unknown';

export interface ResumeSignals {
  trial: boolean;
  proLoading: boolean;
  known: boolean;
  hasPro: boolean;
  offerTrial: boolean;
}

// The checkout route quietly charges for an ineligible trial, so the client must not auto-redirect on a guess.
export function resumeDecision({ trial, proLoading, known, hasPro, offerTrial }: ResumeSignals): ResumeDecision {
  if (proLoading) return 'wait';
  if (!known) return 'unknown';
  if (hasPro) return 'already-pro';
  if (!trial) return 'checkout-paid';
  return offerTrial ? 'checkout-trial' : 'trial-used';
}
