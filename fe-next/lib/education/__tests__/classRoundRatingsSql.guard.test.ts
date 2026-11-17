/**
 * class_round_ratings: one row per (student, game_code). Students insert only
 * their own row for a class they belong to. Teachers read rows for classrooms
 * they own. No student name column, and not on the realtime publication.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const migrationPath = join(
  process.cwd(),
  'supabase/migrations/20261116143000_class_round_ratings.sql',
);
const sql = existsSync(migrationPath) ? readFileSync(migrationPath, 'utf8') : '';
const flat = sql.toLowerCase().replace(/\s+/g, ' ');

function policy(name: string): string {
  const match = sql.match(new RegExp(`create policy ${name}\\b[\\s\\S]*?;`, 'i'));
  return match ? match[0].toLowerCase().replace(/\s+/g, ' ') : '';
}

describe('class_round_ratings migration', () => {
  it('exists', () => {
    expect(sql.length).toBeGreaterThan(0);
  });

  it('stores one rating per student and game code, with no name column', () => {
    expect(flat).toMatch(/create table if not exists public\.class_round_ratings/);
    expect(flat).toMatch(/unique \(student_id, game_code\)/);
    expect(flat).toMatch(/rating text not null check \(rating in \('bad', 'ok', 'great'\)\)/);
    expect(flat).not.toMatch(/\b(display_name|username|student_name|full_name)\b/);
  });

  it('lets a student insert only their own row for a class they belong to', () => {
    const insert = policy('class_round_ratings_insert_own');
    expect(insert).toMatch(/for insert to authenticated/);
    expect(insert).toMatch(/student_id = \(select auth\.uid\(\)\)/);
    expect(insert).toMatch(/is_classroom_member\(classroom_id, \(select auth\.uid\(\)\)\)/);
  });

  it('lets a student replace their own row, so the write is idempotent', () => {
    const update = policy('class_round_ratings_update_own');
    expect(update).toMatch(/for update to authenticated/);
    expect(update).toMatch(/student_id = \(select auth\.uid\(\)\)/);
    expect(update).toMatch(/is_classroom_member\(classroom_id, \(select auth\.uid\(\)\)\)/);
  });

  it('lets a student read their own row so an upsert can return it', () => {
    const select = policy('class_round_ratings_select_own');
    expect(select).toMatch(/for select to authenticated/);
    expect(select).toMatch(/student_id = \(select auth\.uid\(\)\)/);
    expect(select).not.toMatch(/is_classroom_owner/);
  });

  it('lets a teacher read ratings only for classrooms they own', () => {
    const select = policy('class_round_ratings_select_owner');
    expect(select).toMatch(/for select to authenticated/);
    expect(select).toMatch(/is_classroom_owner\(classroom_id, \(select auth\.uid\(\)\)\)/);
    expect(select).not.toMatch(/\bor\b/);
  });

  it('does not publish the table to supabase_realtime', () => {
    expect(flat).not.toMatch(/alter publication supabase_realtime/);
    expect(flat).not.toMatch(/supabase_realtime add table/);
  });

  it('does not grant anon or delete', () => {
    expect(flat).toMatch(/revoke all on public\.class_round_ratings from public, anon/);
    expect(flat).toMatch(/grant select, insert, update on public\.class_round_ratings to authenticated/);
    expect(flat).not.toMatch(/grant delete/);
  });
});
