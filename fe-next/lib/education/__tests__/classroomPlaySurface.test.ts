import { describe, it, expect } from 'vitest';
import { isClassroomStudentPlay } from '../classroomPlaySurface';

/**
 * `?classroom=true` is the ONLY signal that a live multiplayer room is a class
 * session — every student entry point sets it (`useJoinFlow`, the student
 * banner, PlayWithClassButton) and the teacher's own entry adds `&host=true`.
 * It is in the URL from the first paint, so nothing about it resolves late
 * (recurring pitfall class 1: no optimistic default a later source can flip).
 *
 * `quietChromeRoutes.ts` deliberately does NOT use it — `usePathname()` has no
 * query string. This predicate is for callers that hold the search params.
 */
describe('isClassroomStudentPlay', () => {
  const params = (init: string) => new URLSearchParams(init);

  it('is true for a student who joined a class game', () => {
    expect(isClassroomStudentPlay(params('room=ABC123&classroom=true'))).toBe(true);
  });

  it('is false for the teacher hosting that same game', () => {
    // The host's phone/projector is not the surface the research protects.
    expect(isClassroomStudentPlay(params('room=ABC123&classroom=true&host=true'))).toBe(false);
  });

  it('is false in a public multiplayer room', () => {
    expect(isClassroomStudentPlay(params('room=ABC123'))).toBe(false);
  });

  it('only accepts the literal "true" — a truthy-looking value is not enough', () => {
    expect(isClassroomStudentPlay(params('classroom=1'))).toBe(false);
    expect(isClassroomStudentPlay(params('classroom=false'))).toBe(false);
  });

  it('is false, never a throw, when there are no params at all', () => {
    expect(isClassroomStudentPlay(null)).toBe(false);
    expect(isClassroomStudentPlay(undefined)).toBe(false);
  });
});
