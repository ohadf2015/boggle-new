/**
 * lobbyDailyEmber — pure state selector for the ambient Daily-Challenge "ember"
 * shown on the player's OWN hero card in the multiplayer waiting room.
 *
 * Design intent (see docs/2026-06-21-mp-lobby-daily-ember.md):
 * a NON-disruptive, pull-not-push awareness signal. It never offers a path that
 * leaves the live room — the badge IS the marketing. This module decides only
 * WHICH ember state to surface from the local daily status; rendering/telemetry
 * live in components/lobby/LobbyDailyEmber.tsx.
 */

export type LobbyEmberKind =
  | 'secured' // already played today — calm pride / habit reinforcement
  | 'at_risk' // live streak not yet defended today — gentle pull
  | 'invite' // no streak, not played — pure "the daily exists" awareness
  | 'hidden'; // status still loading — render nothing (no flicker)

export interface LobbyEmberStatusInput {
  hasPlayed: boolean;
  currentStreak: number;
  loading: boolean;
}

export interface LobbyEmberState {
  kind: LobbyEmberKind;
  /** Clamped, non-negative streak for display. */
  streak: number;
}

export function selectLobbyEmberState(status: LobbyEmberStatusInput): LobbyEmberState {
  const streak = Math.max(0, Math.floor(status.currentStreak || 0));

  // Wait for status to settle so the ember never flickers between states.
  if (status.loading) return { kind: 'hidden', streak };

  if (status.hasPlayed) return { kind: 'secured', streak };
  if (streak > 0) return { kind: 'at_risk', streak };
  return { kind: 'invite', streak };
}
