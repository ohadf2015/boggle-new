import { describe, it, expect } from 'vitest';
import { resolveBlastRecover, BLAST_MAX_LIVES, type BlastRecoverInput } from '../blastLives';

/**
 * resolveBlastRecover decides how an out-of-moves dead-end is handled under the
 * 3-lives model: free revive while lives remain, rewarded-ad offer once they're
 * gone, and nothing when the dead-end isn't recoverable.
 */
const base: BlastRecoverInput = {
  livesRemaining: BLAST_MAX_LIVES,
  hasRealAdProvider: true,
  isMultiplayer: false,
  isDeadEnd: true,
  noWordsRemaining: false,
  hasUsedContinue: false,
  continueDeclined: false,
  objectiveAlreadyMet: false,
};

describe('resolveBlastRecover', () => {
  it('default lives is 3', () => {
    expect(BLAST_MAX_LIVES).toBe(3);
  });

  it('given lives remain and a recoverable dead-end → free-revive', () => {
    expect(resolveBlastRecover({ ...base, livesRemaining: 3 })).toBe('free-revive');
    expect(resolveBlastRecover({ ...base, livesRemaining: 1 })).toBe('free-revive');
  });

  it('free-revive does NOT require an ad provider (lives are free)', () => {
    expect(resolveBlastRecover({ ...base, livesRemaining: 2, hasRealAdProvider: false })).toBe('free-revive');
  });

  it('given lives exhausted and the ad gate is open → ad-offer', () => {
    expect(resolveBlastRecover({ ...base, livesRemaining: 0 })).toBe('ad-offer');
  });

  it('given lives exhausted but continue already used → none', () => {
    expect(resolveBlastRecover({ ...base, livesRemaining: 0, hasUsedContinue: true })).toBe('none');
  });

  it('given lives exhausted but continue already declined → none', () => {
    expect(resolveBlastRecover({ ...base, livesRemaining: 0, continueDeclined: true })).toBe('none');
  });

  it('given lives exhausted but no ad provider → none', () => {
    expect(resolveBlastRecover({ ...base, livesRemaining: 0, hasRealAdProvider: false })).toBe('none');
  });

  it('not a dead-end → none even with lives', () => {
    expect(resolveBlastRecover({ ...base, isDeadEnd: false })).toBe('none');
  });

  it('no words remaining → none (a free revive cannot help)', () => {
    expect(resolveBlastRecover({ ...base, noWordsRemaining: true })).toBe('none');
  });

  it('objective already met → none (wave will advance)', () => {
    expect(resolveBlastRecover({ ...base, objectiveAlreadyMet: true })).toBe('none');
  });

  it('multiplayer never recovers (server-authoritative)', () => {
    expect(resolveBlastRecover({ ...base, isMultiplayer: true })).toBe('none');
    expect(resolveBlastRecover({ ...base, isMultiplayer: true, livesRemaining: 0 })).toBe('none');
  });
});
