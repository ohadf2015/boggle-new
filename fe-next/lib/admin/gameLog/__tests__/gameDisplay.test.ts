import { describe, it, expect } from 'vitest';
import { gameModeLabel, playersSummary, deviceLabel } from '../gameDisplay';
import type { UnifiedGame } from '@/components/admin/today-games/types';

const base: UnifiedGame = {
  id: '1',
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
  language: 'en',
  time_played: 0,
  created_at: '2026-05-30T00:00:00Z',
  profiles: null,
};

const t = (k: string, fb?: string) => fb ?? k;

describe('gameModeLabel', () => {
  it('humanizes known canonical modes', () => {
    expect(gameModeLabel('word-hunt', t)).toBe('Word Hunt');
    expect(gameModeLabel('wheel-rush', t)).toBe('Word Wheel');
    expect(gameModeLabel('classic', t)).toBe('Classic');
    expect(gameModeLabel('blast', t)).toBe('Blast');
  });
  it('falls back to a title-cased version of unknown modes', () => {
    expect(gameModeLabel('some_new-mode', t)).toBe('Some New Mode');
    expect(gameModeLabel('unknown', t)).toBe('Unknown');
  });
  it('handles empty/nullish', () => {
    expect(gameModeLabel('', t)).toBe('—');
    expect(gameModeLabel(null, t)).toBe('—');
  });
});

describe('playersSummary', () => {
  it('reports human players and bots when both known', () => {
    expect(playersSummary({ ...base, is_multiplayer: true, player_count: 4, bot_count: 2 })).toEqual({
      humans: 4,
      bots: 2,
      botsKnown: true,
      text: '4 players · 2 bots',
    });
  });
  it('omits bots when bot_count is not recorded (older games)', () => {
    const r = playersSummary({ ...base, is_multiplayer: true, player_count: 3, bot_count: null });
    expect(r.botsKnown).toBe(false);
    expect(r.text).toBe('3 players');
  });
  it('labels single-player when not multiplayer', () => {
    const r = playersSummary({ ...base, is_multiplayer: false, player_count: null });
    expect(r.text).toBe('Single player');
    expect(r.humans).toBe(1);
  });
});

describe('deviceLabel', () => {
  it('combines device, os and browser when present', () => {
    expect(deviceLabel({ ...base, device_type: 'mobile', os: 'iOS', browser: 'Safari' })).toBe('Mobile · iOS · Safari');
  });
  it('degrades gracefully with partial info', () => {
    expect(deviceLabel({ ...base, device_type: 'desktop', os: null, browser: 'Chrome' })).toBe('Desktop · Chrome');
    expect(deviceLabel({ ...base, device_type: null, os: null, browser: null })).toBe('Unknown device');
  });
});
