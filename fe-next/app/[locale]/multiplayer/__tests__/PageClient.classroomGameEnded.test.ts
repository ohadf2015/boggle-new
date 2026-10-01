import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readMpPageSource } from './mpPageSource';

/**
 * PostHog: every refused classroom join is ROOM_GONE (36 of 83 attempts). The
 * student got a toast and an instant push to /student — a dead end with no
 * retry, and no route at all for a student without a class. The decision is
 * still `roomGoneAction`; what changed is what "exit to hub" shows.
 */
const source = readMpPageSource();
const page = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

function exitBody(): string {
  const start = source.indexOf('const exitClassroomStudentToHub');
  const end = source.indexOf('}, [', start);
  return start < 0 || end < 0 ? '' : source.slice(start, end);
}

describe('a classroom student whose room is gone gets a friendly state, not a dead refusal', () => {
  it('exitClassroomStudentToHub shows the ended state instead of teleporting with a toast', () => {
    const body = exitBody();
    expect(body).not.toBe('');
    expect(body).toMatch(/setClassroomEnded\(/);
    expect(body).not.toMatch(/router\.push\(/);
    expect(body).not.toMatch(/toast\(/);
  });

  it('still leaves the room: the page stays mounted, so a promoted student must not linger as a ghost host', () => {
    const body = exitBody();
    expect(body).toMatch(/emit\('leaveRoom'/);
    expect(body).toMatch(/boggle_intentional_exit/);
  });

  it('PageClient renders the ended state with the class-hub path and the room-gone copy', () => {
    const start = page.indexOf('<ClassroomGameEndedState');
    expect(start).toBeGreaterThan(-1);
    const block = page.slice(start, page.indexOf('/>', start));
    expect(block).toMatch(/hubHref=\{classroomStudentHomePath\(/);
    expect(block).toMatch(/message=\{t\(CLASSROOM_ROOM_GONE_KEY\)\}/);
    expect(block).toMatch(/onRetry=\{retryClassroomRoom\}/);
  });

  it('retry re-joins through the same handleJoin the early-joiner wait uses', () => {
    const start = source.indexOf('const retryClassroomRoom');
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('}, [', start));
    expect(body).toMatch(/setClassroomEnded\(null\)/);
    expect(body).toMatch(/handleJoin\(false, null, code, undefined, username\)/);
  });

  it('retry clears the intentional-exit flag, so a later reload of the rejoined room still auto-rejoins', () => {
    const start = source.indexOf('const retryClassroomRoom');
    const body = source.slice(start, source.indexOf('}, [', start));
    expect(body).toMatch(/removeItem\('boggle_intentional_exit'\)/);
  });
});
