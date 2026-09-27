/**
 * Back from the classroom lobby must return a teacher to /teacher.
 *
 * `handleBack` only ever runs inside <TeacherGate> (guests get
 * ClassroomGuestDemo instead), so every caller is a teacher who arrived from
 * the dashboard's GO LIVE. It pushed `/education` — the MARKETING landing —
 * so a teacher backing out of a lobby was dropped on a sales page with a
 * "PLAY NOW — NO SIGN-UP" hero, not on their dashboard. Reported as
 * navigation that "sometimes goes back to the lexiclash homepage".
 *
 * Source-scanned, matching guestEntry.test.ts: the page's imports pull auth
 * and both lobbies, and the question is which route the callback names.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

function handleBackBody(): string {
  const start = SRC.indexOf('const handleBack = useCallback(');
  expect(start).toBeGreaterThan(-1);
  return SRC.slice(start, SRC.indexOf('}, [', start));
}

describe('classroom-game back navigation', () => {
  it('returns a teacher to the teacher dashboard', () => {
    expect(handleBackBody()).toMatch(/\/teacher`/);
  });

  it('does not drop a teacher on the marketing landing', () => {
    expect(handleBackBody()).not.toMatch(/\/education`/);
  });
});
