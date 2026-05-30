import { describe, it, expect } from 'vitest';
import { mapAnalyticsEventToGame, type AnalyticsEventRow } from '../analyticsEventMapper';

const MP_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

function row(overrides: Partial<AnalyticsEventRow> = {}): AnalyticsEventRow {
  return {
    id: 'evt-1',
    event_type: 'game_completed',
    player_id: null,
    session_id: 'guest_1717000000000_abc123',
    country_code: 'US',
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer: null,
    created_at: '2026-05-30T10:00:00.000Z',
    metadata: {},
    ...overrides,
  };
}

describe('mapAnalyticsEventToGame', () => {
  it('maps a multiplayer guest game_completed event', () => {
    const g = mapAnalyticsEventToGame(
      row({
        country_code: 'NL',
        referrer: 'https://www.google.com/',
        metadata: {
          mode: 'word-hunt',
          gameMode: 'word-hunt',
          gameCode: 'WKVNGF',
          score: 120,
          wordCount: 14,
          durationSec: 95,
          isMultiplayer: true,
          playerCount: 2,
          role: 'host',
          isWinner: true,
          isGuest: true,
          guest_name: 'Sneaky Fox',
          user_agent: MP_UA,
        },
      }),
    );
    expect(g.source).toBe('analytics');
    expect(g.mode).toBe('word-hunt');
    expect(g.is_multiplayer).toBe(true);
    expect(g.player_count).toBe(2);
    expect(g.role).toBe('host');
    expect(g.is_winner).toBe(true);
    expect(g.is_guest).toBe(true);
    expect(g.game_code).toBe('WKVNGF');
    expect(g.score).toBe(120);
    expect(g.word_count).toBe(14);
    expect(g.time_played).toBe(95);
    expect(g.country).toBe('NL');
    expect(g.device_type).toBe('desktop');
    expect(g.browser).toBe('Chrome');
    expect(g.guest_session_id).toBe('guest_1717000000000_abc123');
    // attribution: referrer google -> search-classifiable via classifyAcquisition in UI;
    // mapper just carries the raw signal
    expect(g.referrer_source).toBe('https://www.google.com/');
  });

  it('treats player_id presence as registered (not guest)', () => {
    const g = mapAnalyticsEventToGame(
      row({ player_id: 'user-uuid', metadata: { gameMode: 'classic', isGuest: false } }),
      { username: 'alice', display_name: 'Alice', avatar_emoji: null, avatar_color: null },
    );
    expect(g.is_guest).toBe(false);
    expect(g.player_id).toBe('user-uuid');
    expect(g.profiles?.display_name).toBe('Alice');
  });

  it('falls back to metadata.userId for player identity', () => {
    const g = mapAnalyticsEventToGame(
      row({ player_id: null, metadata: { gameMode: 'classic', userId: 'meta-user', isGuest: false } }),
    );
    expect(g.player_id).toBe('meta-user');
    expect(g.is_guest).toBe(false);
  });

  it('defaults single-player events (no MP metadata)', () => {
    const g = mapAnalyticsEventToGame(
      row({ metadata: { gameMode: 'blast', score: 50, wordCount: 5 } }),
    );
    expect(g.is_multiplayer).toBe(false);
    expect(g.player_count).toBeNull();
    expect(g.game_code).toBe('solo');
    expect(g.mode).toBe('blast');
  });

  it('carries utm attribution columns and forward bot_count when present', () => {
    const g = mapAnalyticsEventToGame(
      row({
        utm_source: 'chatgpt.com',
        utm_medium: 'referral',
        utm_campaign: 'launch',
        metadata: { gameMode: 'classic', isMultiplayer: true, playerCount: 3, botCount: 2 },
      }),
    );
    expect(g.utm_source).toBe('chatgpt.com');
    expect(g.utm_medium).toBe('referral');
    expect(g.utm_campaign).toBe('launch');
    expect(g.bot_count).toBe(2);
  });

  it('uses gameMode over mode, falls back to mode then unknown', () => {
    expect(mapAnalyticsEventToGame(row({ metadata: { mode: 'x', gameMode: 'y' } })).mode).toBe('y');
    expect(mapAnalyticsEventToGame(row({ metadata: { mode: 'x' } })).mode).toBe('x');
    expect(mapAnalyticsEventToGame(row({ metadata: {} })).mode).toBe('unknown');
  });

  it('guest display name comes from guest_name when no profile', () => {
    const g = mapAnalyticsEventToGame(row({ metadata: { gameMode: 'classic', isGuest: true, guest_name: 'Wily Wolf' } }));
    expect(g.guest_name).toBe('Wily Wolf');
    expect(g.profiles).toBeNull();
  });
});
