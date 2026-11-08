import { describe, it, expect } from 'vitest';
import { groupGames } from '../groupGames';
import { mapAnalyticsEventToGame, type AnalyticsEventRow } from '../analyticsEventMapper';

function row(over: Partial<AnalyticsEventRow> & { metadata?: Record<string, unknown> }): AnalyticsEventRow {
  return {
    id: over.id ?? Math.random().toString(36).slice(2),
    event_type: over.event_type ?? 'game_abandoned',
    player_id: null,
    session_id: over.session_id ?? 'guest_1794165022923_jhjquy533',
    country_code: 'US',
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    referrer: null,
    created_at: over.created_at ?? '2026-11-08T19:10:29.000Z',
    ...over,
    metadata: over.metadata ?? {},
  };
}

const group = (r: AnalyticsEventRow) => groupGames([mapAnalyticsEventToGame(r)])[0];

describe('groupGames — engagement + sub-mode', () => {
  it('a headless landing-page visit reads as a bot with its sub-mode and coach step', () => {
    const g = group(row({
      metadata: {
        gameMode: 'singleplayer', sp_mode: 'challenge', coach_step: 'inline-hint',
        reason: 'pagehide', durationSec: 3, words_found: 0, is_automated: true,
        landing_path: '/en/boggle-word-shake-free',
      },
    }));
    expect(g.engagement).toBe('bot');
    expect(g.isAutomated).toBe(true);
    expect(g.subMode).toBe('challenge');
    expect(g.durationSec).toBe(3);
    expect(g.players[0].coachStep).toBe('inline-hint');
    expect(g.players[0].landingPath).toBe('/en/boggle-word-shake-free');
  });

  it('a person who left after 4s with no words never played', () => {
    const g = group(row({ metadata: { gameMode: 'singleplayer', sp_mode: 'challenge', reason: 'pagehide', durationSec: 4, words_found: 0 } }));
    expect(g.engagement).toBe('never_played');
    expect(g.isAutomated).toBe(false);
  });

  it('an abandon that found words shows them (words_found), and counts as played', () => {
    const g = group(row({ metadata: { gameMode: 'singleplayer', reason: 'hidden', durationSec: 45, words_found: 6 } }));
    expect(g.totalWords).toBe(6);
    expect(g.engagement).toBe('played');
  });

  it('Word Tower floors count as play even with 0 words', () => {
    const g = group(row({ metadata: { gameMode: 'word-tower', reason: 'exit', durationSec: 178, floors: 4 } }));
    expect(g.engagement).toBe('played');
    expect(g.players[0].floors).toBe(4);
  });

  it('a completed game keeps its duration and first-word time', () => {
    const g = group(row({
      event_type: 'game_completed',
      metadata: { gameMode: 'singleplayer', score: 40, wordCount: 5, durationSec: 60, first_word_sec: 7 },
    }));
    expect(g.engagement).toBe('played');
    expect(g.durationSec).toBe(60);
    expect(g.players[0].firstWordSec).toBe(7);
  });

  it('one real player in a room makes the whole game real', () => {
    const rows = [
      row({ id: 'a', session_id: 's1', event_type: 'game_completed', metadata: { gameMode: 'classic', isMultiplayer: true, gameCode: 'ROOM1', score: 30, wordCount: 4, durationSec: 90 } }),
      row({ id: 'b', session_id: 's2', event_type: 'game_abandoned', metadata: { gameMode: 'classic', isMultiplayer: true, gameCode: 'ROOM1', durationSec: 5, is_automated: true } }),
    ].map((r) => mapAnalyticsEventToGame(r));
    const [g] = groupGames(rows);
    expect(g.engagement).toBe('played');
    expect(g.isAutomated).toBe(false);
  });
});
