import { describe, it, expect } from 'vitest';
import { accessReturnPath } from '../accessReturnPath';

describe('accessReturnPath', () => {
  it('accepts the education page TeacherGate blocked', () => {
    expect(accessReturnPath('/en/teacher')).toBe('/en/teacher');
    expect(accessReturnPath('/he/teacher/classroom/abc/analytics')).toBe('/he/teacher/classroom/abc/analytics');
  });

  it.each([
    null,
    '',
    '//evil.example/en/teacher',
    'https://evil.example/en/teacher',
    '/\\evil.example',
    '/en',
    '/en/multiplayer',
    '/en/education/access',
    'en/teacher',
  ])('rejects %s', (from) => {
    expect(accessReturnPath(from)).toBeNull();
  });
});
