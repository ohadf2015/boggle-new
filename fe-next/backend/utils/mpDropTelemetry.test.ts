import { describe, it, expect } from 'vitest';
import type { Game, GameUser } from '@/shared/types';
import { buildMpDropEvent, buildHostLeftDropEvents } from './mpDropTelemetry';

/**
 * Pure builder for the `mp_player_dropped` telemetry event.
 *
 * Context: MP mid-game leaves were UNINSTRUMENTED on both ends (PostHog client
 * never fired `game_abandoned` for MP; server disconnect logs are ephemeral).
 * This event, captured at grace-period expiry (the "disconnected and never came
 * back" moment), is what makes the dropout root-cause measurable. The `reason`
 * field is what separates a connectivity BUG (ping timeout / transport close)
 * from a PRODUCT cause (explicit leave / boredom).
 */

function makeUser(overrides: Partial<GameUser> = {}): GameUser {
  return {
    username: overrides.username ?? 'alice',
    avatar: { type: 'preset', value: 'cat' } as unknown as GameUser['avatar'],
    isHost: false,
    socketId: 's1',
    ...overrides,
  };
}

function makeGame(overrides: Partial<Game> = {}): Game {
  return {
    gameCode: 'ABCD',
    hostSocketId: 's-host',
    hostUsername: 'alice',
    roomName: 'room',
    language: 'en',
    users: {},
    playerScores: {},
    playerWords: {},
    playerWordDetails: {},
    playerAchievements: {},
    gameState: 'in-progress',
    letterGrid: null,
    timerSeconds: 180,
    tournamentId: null,
    reconnectionTimeout: null,
    isRanked: false,
    allowLateJoin: true,
    createdAt: 1000,
    lastActivity: 1000,
    ...overrides,
  } as Game;
}

describe('buildMpDropEvent', () => {
  it('builds an mp_player_dropped event keyed to the dropping player with the disconnect reason', () => {
    const game = makeGame({
      gameMode: 'blast',
      gameStartedAt: 100_000,
      users: { alice: makeUser({ username: 'alice' }), bob: makeUser({ username: 'bob' }) },
    });

    const ev = buildMpDropEvent(game, 'alice', 'ping timeout', 145_000);

    expect(ev.distinctId).toBe('alice');
    expect(ev.event).toBe('mp_player_dropped');
    expect(ev.properties.reason).toBe('ping timeout');
    expect(ev.properties.gameMode).toBe('blast');
    expect(ev.properties.gameCode).toBe('ABCD');
    expect(ev.properties.language).toBe('en');
    expect(ev.properties.source).toBe('grace_expiry');
  });

  it('computes durationSec as whole seconds since gameStartedAt', () => {
    const game = makeGame({ gameStartedAt: 100_000 });
    const ev = buildMpDropEvent(game, 'alice', 'transport close', 145_500);
    // (145500 - 100000) / 1000 = 45.5 → rounded 46
    expect(ev.properties.durationSec).toBe(46);
  });

  it('returns null durationSec when the game never recorded a start timestamp', () => {
    const game = makeGame({ gameStartedAt: undefined });
    const ev = buildMpDropEvent(game, 'alice', 'transport close', 145_000);
    expect(ev.properties.durationSec).toBeNull();
  });

  it('clamps durationSec to 0 when now precedes gameStartedAt (clock skew)', () => {
    const game = makeGame({ gameStartedAt: 200_000 });
    const ev = buildMpDropEvent(game, 'alice', 'ping timeout', 150_000);
    expect(ev.properties.durationSec).toBe(0);
  });

  it('counts only human players and flags isMultiplayer when ≥2 humans are present', () => {
    const game = makeGame({
      users: {
        alice: makeUser({ username: 'alice' }),
        bob: makeUser({ username: 'bob' }),
        bot1: makeUser({ username: 'bot1', isBot: true }),
      },
    });
    const ev = buildMpDropEvent(game, 'alice', 'ping timeout', 1000);
    expect(ev.properties.humanPlayers).toBe(2);
    expect(ev.properties.isMultiplayer).toBe(true);
  });

  it('is not multiplayer when the dropping player was the only human (bots fill the rest)', () => {
    const game = makeGame({
      users: {
        alice: makeUser({ username: 'alice' }),
        bot1: makeUser({ username: 'bot1', isBot: true }),
        bot2: makeUser({ username: 'bot2', isBot: true }),
      },
    });
    const ev = buildMpDropEvent(game, 'alice', 'io client disconnect', 1000);
    expect(ev.properties.humanPlayers).toBe(1);
    expect(ev.properties.isMultiplayer).toBe(false);
  });

  it('records whether the dropping player was the host', () => {
    const game = makeGame({
      users: { alice: makeUser({ username: 'alice', isHost: true }) },
    });
    const ev = buildMpDropEvent(game, 'alice', 'ping timeout', 1000);
    expect(ev.properties.wasHost).toBe(true);
  });

  it('defaults gameMode to classic when the game has no explicit mode', () => {
    const game = makeGame({ gameMode: undefined });
    const ev = buildMpDropEvent(game, 'alice', 'ping timeout', 1000);
    expect(ev.properties.gameMode).toBe('classic');
  });
});

/**
 * Host-drop cascade: when the host leaves and the room closes, EVERY remaining
 * player is kicked mid-game and the game is deleted — so their own disconnects
 * find no game and emit nothing. This is the single most literal "many players
 * leave at once" path; without a dedicated emit at the close point it stays dark.
 */
describe('buildHostLeftDropEvents', () => {
  it('emits one mp_player_dropped per human, tagged source=host_left, excluding bots', () => {
    const game = makeGame({
      gameMode: 'classic',
      gameStartedAt: 100_000,
      users: {
        host: makeUser({ username: 'host', isHost: true }),
        bob: makeUser({ username: 'bob' }),
        carol: makeUser({ username: 'carol' }),
        bot1: makeUser({ username: 'bot1', isBot: true }),
      },
    });

    const evs = buildHostLeftDropEvents(game, 145_000);

    expect(evs.map((e) => e.distinctId).sort()).toEqual(['bob', 'carol', 'host']);
    for (const e of evs) {
      expect(e.event).toBe('mp_player_dropped');
      expect(e.properties.reason).toBe('host_left');
      expect(e.properties.source).toBe('host_left');
      expect(e.properties.humanPlayers).toBe(3);
      expect(e.properties.isMultiplayer).toBe(true);
      expect(e.properties.durationSec).toBe(45);
    }
  });

  it('marks the leaving host with wasHost=true and the kicked players false', () => {
    const game = makeGame({
      users: {
        host: makeUser({ username: 'host', isHost: true }),
        bob: makeUser({ username: 'bob' }),
      },
    });

    const evs = buildHostLeftDropEvents(game, 1000);
    const byName = Object.fromEntries(evs.map((e) => [e.distinctId, e]));

    expect(byName.host.properties.wasHost).toBe(true);
    expect(byName.bob.properties.wasHost).toBe(false);
  });

  it('measures each row from the player\'s own disconnectedAt when present (host dropped a grace period before the room closed)', () => {
    const game = makeGame({
      gameStartedAt: 100_000,
      users: {
        // Host dropped at 130_000 (30s of play) then the room closed at 250_000.
        host: makeUser({ username: 'host', isHost: true, disconnectedAt: 130_000 }),
        // Victim never disconnected — they played until the room closed.
        bob: makeUser({ username: 'bob' }),
      },
    });

    const evs = buildHostLeftDropEvents(game, 250_000);
    const byName = Object.fromEntries(evs.map((e) => [e.distinctId, e]));

    expect(byName.host.properties.durationSec).toBe(30); // (130000 - 100000)/1000, NOT room-lifetime 150
    expect(byName.bob.properties.durationSec).toBe(150); // played to close
  });

  it('returns no events for a room with only bots left', () => {
    const game = makeGame({
      users: { bot1: makeUser({ username: 'bot1', isBot: true }) },
    });
    expect(buildHostLeftDropEvents(game, 1000)).toEqual([]);
  });
});
