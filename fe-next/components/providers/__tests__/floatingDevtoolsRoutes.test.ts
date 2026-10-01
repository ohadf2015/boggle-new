import { describe, it, expect } from 'vitest';
import { hidesFloatingDevtools } from '../floatingDevtoolsRoutes';

describe('hidesFloatingDevtools — the bottom-right devtools bubble stays off education surfaces', () => {
  it.each([
    ['/en/teacher', ''],
    ['/he/teacher/classroom', ''],
    ['/en/education/classroom-game', '?flow=quick'],
    ['/en/education/access', ''],
    ['/sv/student', ''],
    ['/en/join/ABCDEF', ''],
  ])('Given %s, Then it is hidden', (pathname, search) => {
    expect(hidesFloatingDevtools(pathname, search)).toBe(true);
  });

  it('Given a classroom multiplayer room (host or student), Then it is hidden', () => {
    expect(hidesFloatingDevtools('/en/multiplayer', '?room=AB12CD&classroom=true&host=true')).toBe(true);
    expect(hidesFloatingDevtools('/ja/multiplayer', 'room=AB12CD&classroom=true')).toBe(true);
  });

  it.each([
    ['/en/multiplayer', '?room=AB12CD'],
    ['/en', ''],
    ['/en/blast', ''],
    ['', ''],
  ])('Given a non-education route %s%s, Then it stays available', (pathname, search) => {
    expect(hidesFloatingDevtools(pathname, search)).toBe(false);
  });
});
