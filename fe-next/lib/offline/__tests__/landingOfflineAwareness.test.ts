import { describe, it, expect } from 'vitest';
import { requiresNetworkToPlay } from '../landingOfflineAwareness';

describe('requiresNetworkToPlay', () => {
  it('flags live-multiplayer landing modes as network-only', () => {
    expect(requiresNetworkToPlay('arena')).toBe(true);
  });

  it('does NOT flag offline-capable solo modes (they stay playable on a flight)', () => {
    for (const key of ['blast', 'daily', 'connections', 'adventure', 'brainGym', 'wordCraft', 'practice']) {
      expect(requiresNetworkToPlay(key)).toBe(false);
    }
  });

  it('is conservative — unknown keys default to NOT network-only (never lock a playable card)', () => {
    expect(requiresNetworkToPlay('someFutureSoloMode')).toBe(false);
  });
});
