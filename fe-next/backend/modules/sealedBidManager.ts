/**
 * Sealed Bid (auction) multiplayer state machine — server-authoritative, pure.
 *
 * Each round shows a shared 7-letter rack. Players secretly lock a bid; once all
 * active players have locked (or the round deadline fires), the round resolves
 * ACROSS players (sbMpEngine.resolveSbMpRound): a word bid by exactly one player
 * scores double, a word bid by >=2 players scores half for each, a pass/invalid
 * scores nothing. Scores accumulate. Socket glue + timers live in the handler.
 */
import type { SealedBidModeState } from '@/shared/types/game';
import { resolveSbMpRound, type SbMpBid, type SbMpPlayerResult } from '@/lib/sealedBid/mp/sbMpEngine';

/** Default seconds a bidding round stays open before auto-resolving. */
export const SEALED_BID_ROUND_MS = 30000;

export function initSealedBidState(
  players: string[],
  racks: string[],
  now: number = Date.now(),
  roundMs: number = SEALED_BID_ROUND_MS,
): SealedBidModeState {
  const scores: Record<string, number> = {};
  for (const p of players) scores[p] = 0;
  return {
    players: [...players],
    racks: [...racks],
    index: 0,
    phase: 'bidding',
    bids: {},
    scores,
    startedAt: now,
    roundDeadline: now + roundMs,
  };
}

export function currentRack(state: SealedBidModeState): string | null {
  return state.racks[state.index] ?? null;
}

/** Lock a player's bid for the current round (no-op outside the bidding phase). */
export function lockBid(
  state: SealedBidModeState,
  username: string,
  word: string | null,
  valid: boolean,
): SealedBidModeState {
  if (state.phase !== 'bidding') return state;
  return {
    ...state,
    bids: { ...state.bids, [username]: { word, valid, locked: true } },
  };
}

/** True when every still-active player has locked a bid this round. */
export function allActiveLocked(state: SealedBidModeState, activePlayers: string[]): boolean {
  return activePlayers.every((p) => state.bids[p]?.locked === true);
}

/**
 * Resolve the current round across all players. Players who never locked are
 * treated as a pass (none/0). Returns the revealed state (scores banked) and the
 * per-player results for broadcast.
 */
export function resolveRound(state: SealedBidModeState): { state: SealedBidModeState; results: SbMpPlayerResult[] } {
  const bids: SbMpBid[] = state.players.map((username) => {
    const entry = state.bids[username];
    return { username, word: entry?.word ?? null, valid: entry?.valid ?? false };
  });
  const results = resolveSbMpRound(bids);
  const scores = { ...state.scores };
  for (const r of results) scores[r.username] = (scores[r.username] ?? 0) + r.points;
  return { state: { ...state, phase: 'revealed', scores }, results };
}

/** Advance from a revealed round to the next bidding round, or finish the match. */
export function advanceRound(
  state: SealedBidModeState,
  now: number = Date.now(),
  roundMs: number = SEALED_BID_ROUND_MS,
): SealedBidModeState {
  const next = state.index + 1;
  if (next >= state.racks.length) {
    return { ...state, phase: 'done', bids: {} };
  }
  return { ...state, index: next, phase: 'bidding', bids: {}, roundDeadline: now + roundMs };
}
