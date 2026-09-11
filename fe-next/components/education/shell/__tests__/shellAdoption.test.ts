/**
 * Every teacher and student CRUD screen goes through the shell — including the
 * loading and error branches.
 *
 * A page whose happy path is wrapped but whose error state still opens with
 * `min-h-screen` fails on a real tester's first load, which is exactly when an
 * error state is on screen. `min-h-screen` is the tell: it says "grow the page
 * to at least the viewport and then keep going", which is the opposite of the
 * contract. So is a second `overflow-y-auto` — the shell already owns the one
 * scrolling region, and a nested scroller is the thing that makes a page feel
 * like two pages.
 *
 * Source-level on purpose: rendering nine route clients would need nine sets of
 * Supabase/auth/socket mocks to assert a layout property that is entirely
 * static in the markup.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

/** Every screen named in the no-scroll contract. */
const SCREENS: readonly [string, string][] = [
  ['/teacher', 'components/teacher/TeacherDashboard.tsx'],
  ['/teacher/curriculum', 'app/[locale]/teacher/curriculum/PageClient.tsx'],
  ['/teacher/reports', 'app/[locale]/teacher/reports/PageClient.tsx'],
  ['/teacher/classroom/[id]/analytics', 'app/[locale]/teacher/classroom/[id]/analytics/PageClient.tsx'],
  ['/teacher/profile', 'app/[locale]/teacher/profile/PageClient.tsx'],
  ['/student', 'app/[locale]/student/PageClient.tsx'],
  ['/student/achievements', 'app/[locale]/student/achievements/PageClient.tsx'],
  ['/student/lessons/[id]', 'app/[locale]/student/lessons/[id]/PageClient.tsx'],
  ['/student/profile', 'app/[locale]/student/profile/PageClient.tsx'],
];

describe.each(SCREENS)('%s', (_route, file) => {
  const src = readFileSync(path.join(ROOT, file), 'utf8');

  it('mounts the shared EducationShell', () => {
    expect(src).toContain('EducationShell');
  });

  it('has no min-h-screen / min-h-dvh / h-screen root left, on any branch', () => {
    expect(src).not.toMatch(/min-h-screen/);
    expect(src).not.toMatch(/min-h-dvh/);
    expect(src).not.toMatch(/\bh-screen\b/);
  });

  it('adds no scroller of its own — the shell owns the only one', () => {
    expect(src).not.toMatch(/overflow-y-auto/);
  });
});
