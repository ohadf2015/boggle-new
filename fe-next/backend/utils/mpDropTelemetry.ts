/**
 * MP drop telemetry — pure payload builder.
 *
 * Emits `mp_player_dropped` at grace-period expiry (the "disconnected and never
 * reconnected" moment) so MP mid-game leaves become measurable. Before this,
 * dropout was blind on BOTH ends: PostHog never fired `game_abandoned` for MP,
 * and server disconnect logs are per-deployment ephemeral. The `reason` field
 * separates a connectivity BUG (ping timeout / transport close) from a PRODUCT
 * cause (explicit leave / boredom).
 *
 * Pure + injectable `now` so it is fully unit-testable; the I/O (getPostHogServer
 * + capture) stays in the caller (connectionHandler grace-expiry callback).
 */

import type { Game } from '@/shared/types';

/** Where the drop was observed. `grace_expiry` = silent disconnect-without-reconnect;
 *  `host_left` = kicked because the host abandoned and the room closed. */
export type MpDropSource = 'grace_expiry' | 'host_left';

export interface MpDropEvent {
  distinctId: string;
  event: 'mp_player_dropped';
  properties: {
    reason: string;
    gameCode: string;
    gameMode: string;
    gameState: string;
    language: string;
    /** Whole seconds the player was in the game before dropping; null if start was never recorded. */
    durationSec: number | null;
    /** Whole seconds since the room was created (its lobby lifetime at drop time). Unlike
     *  durationSec this is ALWAYS present — it is the only wait-time signal for a `waiting`
     *  drop (durationSec is null there), i.e. the solo-host-abandons-empty-lobby case. */
    lobbyWaitSec: number;
    /** Human (non-bot) seats at drop time, including the dropping player. */
    humanPlayers: number;
    isMultiplayer: boolean;
    wasHost: boolean;
    source: MpDropSource;
  };
}

function buildDrop(
  game: Game,
  username: string,
  reason: string,
  now: number,
  source: MpDropSource,
  humanPlayers: number,
): MpDropEvent {
  const durationSec =
    typeof game.gameStartedAt === 'number'
      ? Math.max(0, Math.round((now - game.gameStartedAt) / 1000))
      : null;

  const lobbyWaitSec = Math.max(0, Math.round((now - game.createdAt) / 1000));

  return {
    distinctId: username,
    event: 'mp_player_dropped',
    properties: {
      reason,
      gameCode: game.gameCode,
      gameMode: game.gameMode ?? 'classic',
      gameState: game.gameState,
      language: game.language,
      durationSec,
      lobbyWaitSec,
      humanPlayers,
      isMultiplayer: humanPlayers >= 2,
      wasHost: game.users[username]?.isHost ?? false,
      source,
    },
  };
}

function countHumans(game: Game): number {
  return Object.values(game.users).filter((u) => !u?.isBot).length;
}

/**
 * Build the `mp_player_dropped` event for a player who exhausted the reconnection
 * grace period. Call BEFORE removing the player from the game so they are still
 * counted in `humanPlayers`.
 *
 * @param game     the live game object (player still present in `game.users`)
 * @param username the dropping player's username
 * @param reason   the socket disconnect reason captured at disconnect time
 * @param now      epoch ms of the ACTUAL drop (disconnectedAt) — NOT grace-expiry time,
 *                 which would inflate every durationSec past the grace and hide rage-quits
 */
export function buildMpDropEvent(
  game: Game,
  username: string,
  reason: string,
  now: number,
): MpDropEvent {
  return buildDrop(game, username, reason, now, 'grace_expiry', countHumans(game));
}

/**
 * Build one `mp_player_dropped` event per remaining HUMAN when the host abandons
 * and the room closes. Call BEFORE deleteGame (players still present in
 * `game.users`). Without this the cascade — the most literal "many players leave
 * at once" — emits nothing, because each victim's own disconnect finds no game.
 *
 * @param game the live game object at the close point
 * @param now  epoch ms the room closed
 */
export function buildHostLeftDropEvents(game: Game, now: number): MpDropEvent[] {
  const humanPlayers = countHumans(game);
  return Object.entries(game.users)
    .filter(([, u]) => !u?.isBot)
    .map(([username, u]) => {
      // Per-player drop moment: the host disconnected a grace period BEFORE the
      // room closed, so use their disconnectedAt; victims (still connected)
      // played until `now`. Without this the host's durationSec is inflated by
      // the full host grace.
      const droppedAt = u?.disconnectedAt ?? now;
      return buildDrop(game, username, 'host_left', droppedAt, 'host_left', humanPlayers);
    });
}
