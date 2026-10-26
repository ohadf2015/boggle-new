import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  isRosterImportServerEnabled,
  matchRoster,
  rosterDisplayName,
  toRosterEntries,
} from '../googleClassroomRoster';

// sha256 hex of 'student@school.org' / 'kid@school.org' (shasum -a 256).
const STUDENT_HASH = 'f5e4c205b9969dd4960747cdfa439b58880b29e54028e957a17e0044e4f89fd2';
const KID_HASH = '563678794b9c9e305eff1bb567a5b04a9e18e6083a9ee85a749a890a78784527';

afterEach(() => vi.unstubAllEnvs());

describe('isRosterImportServerEnabled', () => {
  it('defaults off', () => {
    expect(isRosterImportServerEnabled()).toBe(false);
    vi.stubEnv('GC_ROSTER_IMPORT_ENABLED', 'true');
    expect(isRosterImportServerEnabled()).toBe(true);
  });
});

describe('rosterDisplayName', () => {
  it('keeps the given name and only the family initial', () => {
    expect(rosterDisplayName('Maya', 'Katz')).toBe('Maya K.');
    expect(rosterDisplayName('  Noa ', ' ben-David')).toBe('Noa B.');
    expect(rosterDisplayName('יעל', 'כהן')).toBe('יעל כ.');
  });
  it('degrades without inventing a name', () => {
    expect(rosterDisplayName('Maya', '')).toBe('Maya');
    expect(rosterDisplayName('', 'Katz')).toBe('K.');
    expect(rosterDisplayName(undefined, undefined)).toBe('');
  });
});

describe('toRosterEntries', () => {
  it('turns Classroom students into name + initial + email hash, dropping the raw email', () => {
    const entries = toRosterEntries([
      {
        userId: '1001',
        profile: { emailAddress: 'Student@School.org', name: { givenName: 'Maya', familyName: 'Katz', fullName: 'Maya Katz' } },
      },
      { userId: '1002', profile: { name: { givenName: 'Ari', familyName: 'Levi' } } },
    ]);
    expect(entries).toEqual([
      { googleUserId: '1001', displayName: 'Maya K.', emailHash: STUDENT_HASH },
      { googleUserId: '1002', displayName: 'Ari L.', emailHash: null },
    ]);
    expect(JSON.stringify(entries)).not.toMatch(/school\.org|Katz|Levi/);
  });
});

describe('matchRoster', () => {
  const roster = [
    { googleUserId: '1001', displayName: 'Maya K.', emailHash: STUDENT_HASH },
    { googleUserId: '1002', displayName: 'Ari L.', emailHash: KID_HASH },
    { googleUserId: '1003', displayName: 'Dana R.', emailHash: null },
  ];

  it('prefers a linked Google id, then falls back to the email hash', () => {
    const out = matchRoster(roster, [
      { studentId: 's-linked', linkedGoogleId: '1003', emailHashes: [] },
      { studentId: 's-email', linkedGoogleId: null, emailHashes: [KID_HASH] },
      { studentId: 's-guest', linkedGoogleId: null, emailHashes: [] },
    ]);
    expect(out.matched).toEqual([
      { studentId: 's-linked', googleUserId: '1003', emailHash: null, via: 'external_id' },
      { studentId: 's-email', googleUserId: '1002', emailHash: KID_HASH, via: 'email_hash' },
    ]);
    expect(out.unmatched).toEqual([{ googleUserId: '1001', displayName: 'Maya K.', emailHash: STUDENT_HASH }]);
  });

  it('matches each roster entry and each member at most once', () => {
    const out = matchRoster(roster, [
      { studentId: 'a', linkedGoogleId: '1001', emailHashes: [STUDENT_HASH] },
      { studentId: 'b', linkedGoogleId: null, emailHashes: [STUDENT_HASH] },
    ]);
    expect(out.matched.map((m) => [m.studentId, m.googleUserId])).toEqual([['a', '1001']]);
    expect(out.unmatched.map((u) => u.googleUserId)).toEqual(['1002', '1003']);
  });

  it('ignores a linked id that is not in this course', () => {
    const out = matchRoster(roster, [{ studentId: 'a', linkedGoogleId: '9999', emailHashes: [KID_HASH] }]);
    expect(out.matched).toEqual([{ studentId: 'a', googleUserId: '1002', emailHash: KID_HASH, via: 'email_hash' }]);
  });
});
