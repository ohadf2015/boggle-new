/**
 * shouldOfferBlastContinue — predicate gating the rewarded-ad
 * "continue from dead-end" modal in singleplayer Blast.
 *
 * Adding moves only helps when moves were the limiting factor.
 * If the board itself has no playable words remaining, the modal
 * must stay closed even though isDeadEnd is true.
 */
import { describe, it, expect } from 'vitest';
import { shouldOfferBlastContinue } from '../blastContinueOffer';

const base = {
  hasRealAdProvider: true,
  isMultiplayer: false,
  isDeadEnd: true,
  noWordsRemaining: false,
  hasUsedContinue: false,
  continueDeclined: false,
  objectiveAlreadyMet: false,
};

describe('shouldOfferBlastContinue', () => {
  it('offers when SP dead-end with ad provider and words remain', () => {
    expect(shouldOfferBlastContinue(base)).toBe(true);
  });

  it('does NOT offer when board has no words remaining', () => {
    expect(shouldOfferBlastContinue({ ...base, noWordsRemaining: true })).toBe(false);
  });

  it('does NOT offer in multiplayer', () => {
    expect(shouldOfferBlastContinue({ ...base, isMultiplayer: true })).toBe(false);
  });

  it('does NOT offer without a real ad provider', () => {
    expect(shouldOfferBlastContinue({ ...base, hasRealAdProvider: false })).toBe(false);
  });

  it('does NOT offer when game is not dead-end yet', () => {
    expect(shouldOfferBlastContinue({ ...base, isDeadEnd: false })).toBe(false);
  });

  it('does NOT offer after continue already used', () => {
    expect(shouldOfferBlastContinue({ ...base, hasUsedContinue: true })).toBe(false);
  });

  it('does NOT offer after player declined', () => {
    expect(shouldOfferBlastContinue({ ...base, continueDeclined: true })).toBe(false);
  });

  it('does NOT offer when wave goal (≥90%) is already met — wave will advance, no extra moves needed', () => {
    expect(shouldOfferBlastContinue({ ...base, objectiveAlreadyMet: true })).toBe(false);
  });
});
