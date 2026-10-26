import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { ASSIGNMENT_LIMIT_REACHED } from '@/lib/education/assignmentLimit';

const sql = readFileSync(
  path.join(__dirname, '../../../supabase/migrations/20261026170100_enforce_free_assignment_cap.sql'),
  'utf8',
);

describe('free assignment cap migration', () => {
  it('uses the same per-class limit the AssignmentCreator gate reads', () => {
    const limit = sql.match(/v_assignment_limit constant integer := (\d+);/);
    expect(Number(limit?.[1])).toBe(FREE_TIER_LIMITS.assignmentsPerClass);
  });

  it('counts every assignment row of the class, the same list the creator counts', () => {
    expect(sql).toMatch(
      /select count\(\*\) into v_count\s+from public\.lesson_assignments\s+where classroom_id = new\.classroom_id;/,
    );
  });

  it('runs before insert on lesson_assignments, the table the browser inserts into', () => {
    expect(sql).toMatch(/drop trigger if exists enforce_free_assignment_cap on public\.lesson_assignments;/);
    expect(sql).toMatch(/before insert on public\.lesson_assignments\s+for each row execute function public\.enforce_free_assignment_cap\(\)/);
    expect(sql).not.toMatch(/before (insert or )?update/);
  });

  it('counts under a per-class advisory lock so parallel inserts cannot both pass', () => {
    expect(sql).toMatch(/pg_advisory_xact_lock\(hashtextextended\('assignment_cap:' \|\| new\.classroom_id::text, 0\)\)/);
  });

  it('lifts the cap for paid Pro or a live access trial', () => {
    expect(sql).toMatch(/if public\.teacher_has_pro_for_caps\(v_teacher\) then\s+return new;/);
  });

  it('lets a re-assign of a lesson the class already has reach the unique check', () => {
    expect(sql).toMatch(
      /if exists \(\s*select 1 from public\.lesson_assignments\s+where classroom_id = new\.classroom_id and lesson_id = new\.lesson_id\s*\) then\s+return new;/,
    );
  });

  it('raises the code the client maps to the upsell, with the count detail', () => {
    expect(sql).toContain(`raise exception '${ASSIGNMENT_LIMIT_REACHED}'`);
    expect(sql).toMatch(/json_build_object\('currentCount', v_count, 'limit', v_assignment_limit\)::text/);
  });

  it('never touches existing rows and keeps the function private', () => {
    expect(sql).not.toMatch(/\b(delete from|update public\.lesson_assignments|alter table|drop table)\b/i);
    expect(sql).toMatch(/revoke all on function public\.enforce_free_assignment_cap\(\) from public, anon, authenticated;/);
    expect(sql).toMatch(/create or replace function public\.enforce_free_assignment_cap\(\)/);
  });
});
