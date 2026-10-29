import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '../../..');
const report = readFileSync(path.join(root, 'supabase/reports/signup_first_game.sql'), 'utf8');

describe('signup first-game readout SQL', () => {
  it('is a read-only report graded by surface and role', () => {
    expect(report).not.toMatch(/\b(INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|GRANT)\b/i);
    for (const col of [
      'signup_surface',
      'role',
      'signups',
      'eligible_24h',
      'played_24h',
      'no_game_24h',
      'pct_no_game_24h',
      'eligible_days_1_7',
      'played_days_1_7',
      'pct_played_days_1_7',
    ]) {
      expect(report).toContain(col);
    }
    expect(report).toContain('game_results');
    expect(report).toContain('game_sessions');
    expect(report).toContain("COALESCE(mode, '') <> 'multiplayer'");
    expect(report).toContain('room_code IS NULL');
    expect(report).toContain('daily_word_wheel_attempts');
    expect(report).toContain('daily_word_hunt_attempts');
    expect(report).toContain("AT TIME ZONE 'Asia/Jerusalem'");
    expect(report).toContain('auth.users');
    expect(report).toContain('is_test_account');
    expect(report).not.toContain('p.email');
    expect(report).not.toContain('p.is_anonymous');
  });
});
