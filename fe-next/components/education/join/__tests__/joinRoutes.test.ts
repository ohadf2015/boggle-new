/**
 * Which paths ARE the join screen.
 *
 * Three routes render one `JoinFlow`: `/join` (the address a teacher reads
 * out), `/join/<code>` (where the projector's QR lands) and `/student/join`
 * (the in-app door). Anything that decides "is the student mid-join right now"
 * — the tab bar, the cookie sheet, an install prompt — has to agree on that
 * list, so the list lives here once instead of being re-typed per caller
 * (recurring pitfall class 3: two routes to one outcome that drift).
 *
 * Segment matching, not `startsWith`: a future `/joinery` route must keep its
 * chrome, and `/multiplayer/join` is not this screen.
 */
import { describe, it, expect } from 'vitest';
import { isStudentJoinPath } from '../joinRoutes';

describe('isStudentJoinPath', () => {
  it('matches the address a teacher reads out, in every locale', () => {
    expect(isStudentJoinPath('/en/join')).toBe(true);
    expect(isStudentJoinPath('/he/join')).toBe(true);
    expect(isStudentJoinPath('/ru/join')).toBe(true);
  });

  it('matches where the QR lands, code and all', () => {
    expect(isStudentJoinPath('/he/join/AB3K9Z')).toBe(true);
    expect(isStudentJoinPath('/en/join/ab3k9z')).toBe(true);
  });

  it('matches the in-app student door', () => {
    expect(isStudentJoinPath('/en/student/join')).toBe(true);
    expect(isStudentJoinPath('/student/join')).toBe(true);
  });

  it('matches an unprefixed /join — the locale segment is optional', () => {
    expect(isStudentJoinPath('/join')).toBe(true);
    expect(isStudentJoinPath('/join/AB3K9Z')).toBe(true);
  });

  it('tolerates a trailing slash', () => {
    expect(isStudentJoinPath('/en/join/')).toBe(true);
  });

  it('does NOT swallow a route that merely starts with the letters', () => {
    // The whole reason this is segment-matched.
    expect(isStudentJoinPath('/en/joinery')).toBe(false);
    expect(isStudentJoinPath('/en/joining-instructions')).toBe(false);
  });

  it('does NOT claim some other page that happens to have a join step', () => {
    expect(isStudentJoinPath('/en/multiplayer/join')).toBe(false);
    expect(isStudentJoinPath('/en/teacher')).toBe(false);
    expect(isStudentJoinPath('/en')).toBe(false);
    expect(isStudentJoinPath('/')).toBe(false);
  });

  it('never throws on the empty or missing pathname a router can hand back', () => {
    expect(isStudentJoinPath('')).toBe(false);
    expect(isStudentJoinPath(null)).toBe(false);
    expect(isStudentJoinPath(undefined)).toBe(false);
  });
});
