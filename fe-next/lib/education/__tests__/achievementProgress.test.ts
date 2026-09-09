import { describe, it, expect } from 'vitest';
import {
  STUDENT_PROGRESS_SELECT,
  PROGRESS_UPSERT_CONFLICT,
  buildAchievementsRecord,
  toProgressUpsertRows,
} from '../achievementProgress';
import type { AchievementProgress } from '@/backend/modules/educationAchievementManager';

/**
 * Sentry JAVASCRIPT-NEXTJS-243: the student achievements page selected a column
 * named `count` — PostgREST parses a bare `count` as the aggregate and Postgres
 * answers "must appear in the GROUP BY clause". The real column is
 * `current_count`. The check route had the mirror bug: it wrote
 * `current_value`/`target_value` (no such columns) against a conflict target
 * that is not the table's unique key, so progress never persisted. Both sides
 * now share one module so the column names cannot drift apart again.
 */
describe('student achievement progress columns', () => {
  it('selects the real column, never a bare `count`', () => {
    expect(STUDENT_PROGRESS_SELECT).toBe('achievement_key, current_count');
    expect(STUDENT_PROGRESS_SELECT.split(',').map((s) => s.trim())).not.toContain('count');
  });

  it('upserts on the table unique key (student, achievement, tier)', () => {
    expect(PROGRESS_UPSERT_CONFLICT).toBe('student_id,achievement_key,tier');
  });

  it('maps definitions + progress rows into the grid record using current_count', () => {
    const definitions = [
      { key: 'word_master', category: 'vocabulary', icon: '📚', is_secret: false, base_name_key: 'n.wm', base_description_key: 'd.wm' },
      { key: 'streak', category: 'consistency', icon: '🔥', is_secret: true, base_name_key: 'n.s', base_description_key: 'd.s' },
    ];
    const progress = [
      { achievement_key: 'word_master', current_count: 3 },
      // two tier rows for the same achievement — the grid shows the furthest one
      { achievement_key: 'word_master', current_count: 12 },
    ];

    const record = buildAchievementsRecord(definitions, progress);

    expect(record.word_master.count).toBe(12);
    expect(record.word_master.icon).toBe('📚');
    expect(record.word_master.isSecret).toBe(false);
    expect(record.streak.count).toBe(0);
    expect(record.streak.isSecret).toBe(true);
    expect(record.streak.nameKey).toBe('n.s');
  });

  it('builds upsert rows with the real column names and the tier being tracked', () => {
    const progress: AchievementProgress[] = [
      { key: 'word_master', current_tier: null, progress_value: 3, next_threshold: 10, percent_complete: 30, isSecret: false },
      { key: 'streak', current_tier: 'silver', progress_value: 20, next_threshold: 50, percent_complete: 40, isSecret: false },
      { key: 'maxed', current_tier: 'platinum', progress_value: 500, next_threshold: null, percent_complete: 100, isSecret: false },
      { key: 'untouched', current_tier: null, progress_value: 0, next_threshold: 5, percent_complete: 0, isSecret: false },
    ];

    const rows = toProgressUpsertRows(progress, 'student-1', '2026-09-09T00:00:00.000Z');

    expect(rows).toEqual([
      { student_id: 'student-1', achievement_key: 'word_master', current_count: 3, target_count: 10, tier: 'bronze', updated_at: '2026-09-09T00:00:00.000Z' },
      { student_id: 'student-1', achievement_key: 'streak', current_count: 20, target_count: 50, tier: 'gold', updated_at: '2026-09-09T00:00:00.000Z' },
      { student_id: 'student-1', achievement_key: 'maxed', current_count: 500, target_count: 500, tier: 'platinum', updated_at: '2026-09-09T00:00:00.000Z' },
    ]);
    for (const row of rows) {
      expect(row).not.toHaveProperty('current_value');
      expect(row).not.toHaveProperty('target_value');
    }
  });
});
