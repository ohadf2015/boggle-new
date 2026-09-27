import { describe, it, expect } from 'vitest';
import { selectLobbyEmberState } from '../lobbyDailyEmber';

/**
 * The lobby ember is an AMBIENT, non-disruptive daily-challenge awareness signal
 * shown on the player's OWN hero card in the multiplayer waiting room.
 * It never navigates away — these tests pin only the state-selection logic.
 */
describe('selectLobbyEmberState', () => {
  it('hides while daily status is still loading (no flicker)', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: false, currentStreak: 0, loading: true }),
    ).toEqual({ kind: 'hidden', streak: 0 });
  });

  it('hides while loading even if cached streak exists', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: false, currentStreak: 9, loading: true }).kind,
    ).toBe('hidden');
  });

  it('shows SECURED (calm pride) when today is already played with a live streak', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: true, currentStreak: 12, loading: false }),
    ).toEqual({ kind: 'secured', streak: 12 });
  });

  it('treats played-today as secured even with a 0 streak (defensive)', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: true, currentStreak: 0, loading: false }).kind,
    ).toBe('secured');
  });

  it('shows AT_RISK when a live streak is not yet defended today', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: false, currentStreak: 5, loading: false }),
    ).toEqual({ kind: 'at_risk', streak: 5 });
  });

  it('shows INVITE (pure awareness) when no streak and not played today', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: false, currentStreak: 0, loading: false }),
    ).toEqual({ kind: 'invite', streak: 0 });
  });

  it('never returns a negative streak', () => {
    expect(
      selectLobbyEmberState({ hasPlayed: false, currentStreak: -3, loading: false }).streak,
    ).toBe(0);
  });
});
