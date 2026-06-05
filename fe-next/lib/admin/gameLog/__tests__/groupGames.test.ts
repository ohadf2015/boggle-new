import { describe, it, expect } from 'vitest';
import { groupGames } from '../groupGames';
import type { UnifiedGame } from '@/components/admin/today-games/types';

/** Minimal UnifiedGame factory — only fields groupGames reads. */
function game(over: Partial<UnifiedGame> = {}): UnifiedGame {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    event_type: over.event_type ?? 'game_completed',
    player_id: null,
    guest_session_id: null,
    game_code: 'solo',
    score: 0,
    word_count: 0,
    longest_word: null,
    placement: null,
    is_ranked: false,
    is_guest: true,
    mode: 'classic',
    game_mode: 'classic',
    language: 'en',
    time_played: 0,
    created_at: '2026-05-30T10:00:00.000Z',
    completed_at: '2026-05-30T10:00:00.000Z',
    profiles: null,
    is_multiplayer: false,
    source: 'analytics',
    ...over,
  } as UnifiedGame;
}

describe('groupGames — grouping key', () => {
  it('groups multiplayer rows that share gameCode + day into ONE group', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: true, game_code: 'ROOM01', guest_session_id: 's1' }),
      game({ id: 'b', is_multiplayer: true, game_code: 'ROOM01', guest_session_id: 's2' }),
      game({ id: 'c', is_multiplayer: true, game_code: 'ROOM01', player_id: 'p3' }),
    ];
    const groups = groupGames(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].players).toHaveLength(3);
    expect(groups[0].isMultiplayer).toBe(true);
    expect(groups[0].gameCode).toBe('ROOM01');
  });

  it('keeps each SOLO play as its own group even when they share a solo gameCode', () => {
    // Real data: many distinct solo plays share a puzzle/seed code (e.g. 6QT6J7 x71).
    const rows = [
      game({ id: 'a', is_multiplayer: false, game_code: '6QT6J7', guest_session_id: 's1' }),
      game({ id: 'b', is_multiplayer: false, game_code: '6QT6J7', guest_session_id: 's2' }),
      game({ id: 'c', is_multiplayer: false, game_code: '6QT6J7', guest_session_id: 's1' }),
    ];
    const groups = groupGames(rows);
    expect(groups).toHaveLength(3);
    groups.forEach((g) => expect(g.players).toHaveLength(1));
  });

  it('does NOT merge the same MP gameCode across different days (codes recycle)', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: true, game_code: 'DUP123', created_at: '2026-05-29T23:00:00Z', guest_session_id: 's1' }),
      game({ id: 'b', is_multiplayer: true, game_code: 'DUP123', created_at: '2026-05-30T01:00:00Z', guest_session_id: 's2' }),
    ];
    expect(groupGames(rows)).toHaveLength(2);
  });
});

describe('groupGames — per-player merge & status', () => {
  it('merges a player\'s game_started + game_completed into one player, terminal wins for score', () => {
    const rows = [
      game({ id: 's', event_type: 'game_started', is_multiplayer: true, game_code: 'R1', player_id: 'p1', score: 0 }),
      game({ id: 'c', event_type: 'game_completed', is_multiplayer: true, game_code: 'R1', player_id: 'p1', score: 42, word_count: 7 }),
    ];
    const groups = groupGames(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].players).toHaveLength(1);
    expect(groups[0].players[0].score).toBe(42);
    expect(groups[0].players[0].wordCount).toBe(7);
    expect(groups[0].status).toBe('completed');
  });

  it('marks an MP room as abandoned when started but never completed', () => {
    const rows = [
      game({ id: 's', event_type: 'game_started', is_multiplayer: true, game_code: 'RAB', player_id: 'p1' }),
    ];
    expect(groupGames(rows)[0].status).toBe('abandoned');
  });

  it('drops standalone solo game_started events (no reliable per-play pairing)', () => {
    // Solo completions OUTNUMBER solo starts in real data — a lone solo start is
    // lifecycle noise; the actual play is represented by its completion row.
    const rows = [
      game({ id: 's', event_type: 'game_started', is_multiplayer: false, player_id: 'p1' }),
    ];
    expect(groupGames(rows)).toHaveLength(0);
  });

  it('marks a group as errored when any row carries an error_reason', () => {
    const rows = [
      game({ id: 's', event_type: 'game_started', is_multiplayer: false, player_id: 'p1' }),
      game({ id: 'e', event_type: 'game_abandoned', is_multiplayer: false, player_id: 'p1', error_reason: 'socket_disconnect' }),
    ];
    const g = groupGames(rows)[0];
    expect(g.status).toBe('errored');
    expect(g.errorReasons).toContain('socket_disconnect');
    expect(g.players[0].errorReason).toBe('socket_disconnect');
  });
});

describe('groupGames — host attribution', () => {
  it('identifies the host (role=host) and classifies the host acquisition source', () => {
    const rows = [
      // host attribution lives on game_started in real data
      game({ id: 'hs', event_type: 'game_started', is_multiplayer: true, game_code: 'R2', player_id: 'host1', role: 'host', utm_source: 'chatgpt.com' }),
      game({ id: 'hc', event_type: 'game_completed', is_multiplayer: true, game_code: 'R2', player_id: 'host1', role: 'host', score: 10 }),
      game({ id: 'g', event_type: 'game_completed', is_multiplayer: true, game_code: 'R2', guest_session_id: 's2', role: 'player', score: 5 }),
    ];
    const g = groupGames(rows)[0];
    expect(g.host?.playerId).toBe('host1');
    expect(g.host?.isHost).toBe(true);
    expect(g.hostAcquisition?.kind).toBe('ai'); // chatgpt → ai
    expect(g.players).toHaveLength(2); // host merged across 2 events + 1 guest
  });

  it('falls back to earliest player as host when no role=host row exists', () => {
    const rows = [
      game({ id: 'a', event_type: 'game_started', is_multiplayer: true, game_code: 'R3', player_id: 'p1', created_at: '2026-05-30T10:00:00Z' }),
      game({ id: 'b', event_type: 'game_started', is_multiplayer: true, game_code: 'R3', player_id: 'p2', created_at: '2026-05-30T10:05:00Z' }),
    ];
    const g = groupGames(rows)[0];
    expect(g.host?.playerId).toBe('p1');
  });
});

describe('groupGames — display name & per-player fields', () => {
  it('prefers profile username, then guest_name, then a short guest id', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: true, game_code: 'R4', player_id: 'p1', profiles: { username: 'Ohad', display_name: null, avatar_emoji: null, avatar_color: null } }),
      game({ id: 'b', is_multiplayer: true, game_code: 'R4', guest_session_id: 'guest_1780164352053_09js4zd6s', guest_name: 'CleverFox' }),
      game({ id: 'c', is_multiplayer: true, game_code: 'R4', guest_session_id: 'guest_9999999999999_abcdef', guest_name: null }),
    ];
    const names = groupGames(rows)[0].players.map((p) => p.displayName);
    expect(names).toContain('Ohad');
    expect(names).toContain('CleverFox');
    expect(names.some((n) => /Guest/i.test(n))).toBe(true);
  });

  it('treats a player with a player_id as authed (never a guest) and shows their username', () => {
    const rows = [
      game({
        id: 'a', is_multiplayer: false, player_id: 'p1', is_guest: false,
        profiles: { username: 'RealName', display_name: null, avatar_emoji: null, avatar_color: null },
      }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.displayName).toBe('RealName');
    expect(p.isGuest).toBe(false);
  });

  it('does NOT mislabel an authed player as guest even if metadata.isGuest was set true', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: false, player_id: 'p1', is_guest: true,
        profiles: { username: 'Authed', display_name: null, avatar_emoji: null, avatar_color: null } }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.isGuest).toBe(false);
    expect(p.displayName).toBe('Authed');
  });

  it('shows a Player handle (not Guest) for an authed user whose profile join missed', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: false, player_id: 'abc12345-6789', is_guest: false, profiles: null }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.isGuest).toBe(false);
    expect(p.displayName).not.toMatch(/Guest/i);
    expect(p.displayName).toMatch(/abc12345/);
  });

  it('labels a player with no player_id as a guest', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: false, player_id: null, guest_session_id: 'guest_123_xyz', guest_name: null }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.isGuest).toBe(true);
    expect(p.displayName).toMatch(/Guest/i);
  });

  it('surfaces country, platform, and device per player', () => {
    const rows = [
      game({
        id: 'a', is_multiplayer: false, player_id: 'p1',
        country: 'IL', platform: 'ios',
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        device_type: 'mobile', os: 'iOS', browser: 'Safari',
      }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.country).toBe('IL');
    expect(p.platform).toBe('ios');
    expect(p.deviceType).toBe('mobile');
  });
});

describe('groupGames — robust identity resolution', () => {
  it('resolves the name from ANY row when the terminal (stat) row has no profile', () => {
    // Real-world: the route attaches a profile per player_id, but a race / mixed
    // batch can leave the terminal row without it while the started row has it.
    // Identity must be decoupled from the terminal-preferred stat row.
    const rows = [
      game({ id: 's', event_type: 'game_started', is_multiplayer: true, game_code: 'RID', player_id: 'p1',
        profiles: { username: 'Sara', display_name: null, avatar_emoji: null, avatar_color: null } }),
      game({ id: 'c', event_type: 'game_completed', is_multiplayer: true, game_code: 'RID', player_id: 'p1',
        profiles: null, score: 30 }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.score).toBe(30); // stats still from terminal row
    expect(p.displayName).toBe('Sara'); // identity scanned from the started row
    expect(p.profile?.username).toBe('Sara');
  });

  it('resolves a guest name from any row carrying guest_name', () => {
    const rows = [
      game({ id: 's', event_type: 'game_started', is_multiplayer: true, game_code: 'RG', guest_session_id: 'guest_1_x', guest_name: 'CleverFox' }),
      game({ id: 'c', event_type: 'game_completed', is_multiplayer: true, game_code: 'RG', guest_session_id: 'guest_1_x', guest_name: null, score: 12 }),
    ];
    const p = groupGames(rows)[0].players[0];
    expect(p.displayName).toBe('CleverFox');
  });
});

describe('groupGames — invited-by (non-host MP players)', () => {
  it('sets invitedByName to the host display name for a non-host multiplayer player', () => {
    const rows = [
      game({ id: 'h', event_type: 'game_completed', is_multiplayer: true, game_code: 'INV', player_id: 'host1', role: 'host', score: 10,
        profiles: { username: 'Maya', display_name: null, avatar_emoji: null, avatar_color: null } }),
      game({ id: 'g', event_type: 'game_completed', is_multiplayer: true, game_code: 'INV', guest_session_id: 's2', role: 'player', guest_name: 'Joiner', score: 5 }),
    ];
    const g = groupGames(rows)[0];
    const host = g.players.find((p) => p.isHost)!;
    const joiner = g.players.find((p) => !p.isHost)!;
    expect(host.invitedByName).toBeNull();
    expect(joiner.invitedByName).toBe('Maya');
  });

  it('leaves invitedByName null for solo plays', () => {
    const rows = [
      game({ id: 'a', is_multiplayer: false, player_id: 'p1' }),
    ];
    expect(groupGames(rows)[0].players[0].invitedByName).toBeNull();
  });
});

describe('groupGames — group ordering & aggregates', () => {
  it('sorts groups by createdAt descending and computes top score', () => {
    const rows = [
      game({ id: 'old', is_multiplayer: false, player_id: 'p1', created_at: '2026-05-30T08:00:00Z', score: 3 }),
      game({ id: 'newA', is_multiplayer: true, game_code: 'R5', player_id: 'p2', created_at: '2026-05-30T12:00:00Z', score: 9 }),
      game({ id: 'newB', is_multiplayer: true, game_code: 'R5', guest_session_id: 's3', created_at: '2026-05-30T12:01:00Z', score: 20 }),
    ];
    const groups = groupGames(rows);
    expect(groups[0].createdAt >= groups[1].createdAt).toBe(true);
    const r5 = groups.find((g) => g.gameCode === 'R5')!;
    expect(r5.topScore).toBe(20);
  });
});

describe('groupGames — language recovery', () => {
  // Real data: a solo game emits game_started (carries metadata.language) and
  // game_completed (does NOT). groupGames drops the solo game_started row, so the
  // only language-bearing event is gone before the flag is read — every solo game
  // rendered as English. Recover the language from the dropped start event via the
  // shared session id.
  it("recovers a solo game's language from its dropped game_started row", () => {
    const rows = [
      game({ id: 'start', event_type: 'game_started', is_multiplayer: false, guest_session_id: 'guest_1_he', language: 'he' }),
      game({ id: 'end', event_type: 'game_completed', is_multiplayer: false, guest_session_id: 'guest_1_he', language: 'en' }),
    ];
    const groups = groupGames(rows);
    // Solo groups by terminal event id → exactly one group (the start row is dropped).
    expect(groups).toHaveLength(1);
    expect(groups[0].language).toBe('he');
  });

  it('keeps a non-en language carried directly on the terminal event', () => {
    const rows = [
      game({ id: 'end', event_type: 'game_completed', is_multiplayer: false, guest_session_id: 's', language: 'sv' }),
    ];
    expect(groupGames(rows)[0].language).toBe('sv');
  });

  it("defaults to 'en' when no event of the session carries a non-en language", () => {
    const rows = [
      game({ id: 'end', event_type: 'game_completed', is_multiplayer: false, guest_session_id: 's', language: 'en' }),
    ];
    expect(groupGames(rows)[0].language).toBe('en');
  });
});
