import { describe, it, expect } from 'vitest';
import { resolveStudentDisplayName } from '../studentDisplayName';

const FALLBACK = 'Student';

describe('resolveStudentDisplayName', () => {
  it('prefers the profile display_name', () => {
    const name = resolveStudentDisplayName(
      { display_name: 'Maya K', username: 'maya123' },
      { email: 'maya.kohn@school.edu' },
      FALLBACK,
    );
    expect(name).toBe('Maya K');
  });

  it('falls back to username when display_name is missing', () => {
    const name = resolveStudentDisplayName(
      { display_name: null, username: 'maya123' },
      { email: 'maya.kohn@school.edu' },
      FALLBACK,
    );
    expect(name).toBe('maya123');
  });

  it('uses the email local-part when no profile name exists — NEVER the full email', () => {
    const name = resolveStudentDisplayName(
      { display_name: null, username: null },
      { email: 'maya.kohn@school.edu' },
      FALLBACK,
    );
    expect(name).toBe('maya.kohn');
    expect(name).not.toContain('@');
    expect(name).not.toContain('school.edu');
  });

  it('never leaks the full email under any input', () => {
    const inputs = [
      [{ display_name: null, username: null }, { email: 'a@b.com' }],
      [null, { email: 'x.y@z.org' }],
      [undefined, { email: 'foo@bar.io' }],
    ] as const;
    for (const [profile, user] of inputs) {
      const name = resolveStudentDisplayName(profile, user, FALLBACK);
      expect(name).not.toContain('@');
    }
  });

  it('returns the fallback when nothing is available', () => {
    expect(resolveStudentDisplayName(null, null, FALLBACK)).toBe(FALLBACK);
    expect(resolveStudentDisplayName({ display_name: '  ', username: '' }, { email: '' }, FALLBACK)).toBe(FALLBACK);
  });
});
