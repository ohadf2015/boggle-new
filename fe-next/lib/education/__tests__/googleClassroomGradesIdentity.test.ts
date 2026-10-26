import { describe, it, expect } from 'vitest';
import { matchStudentsByIdentity } from '../googleClassroomGrades';

const roster = [
  { userId: 'g-1', profile: { emailAddress: 'maya@school.org' } },
  { userId: 'g-2', profile: { emailAddress: 'ari@school.org' } },
];

describe('matchStudentsByIdentity', () => {
  it('matches a linked guest with no email by Google id', () => {
    const out = matchStudentsByIdentity(
      [{ studentId: 'guest', name: 'Maya', email: null }],
      roster,
      new Map([['guest', 'g-1']]),
    );
    expect(out.matched).toEqual([{ studentId: 'guest', name: 'Maya', googleUserId: 'g-1' }]);
    expect(out.unmatched).toEqual([]);
  });

  it('keeps email matching for students without a link', () => {
    const out = matchStudentsByIdentity(
      [
        { studentId: 'linked', name: 'Maya', email: 'other@home.net' },
        { studentId: 'byEmail', name: 'Ari', email: 'ARI@school.org' },
        { studentId: 'guest', name: 'Guest', email: null },
      ],
      roster,
      new Map([['linked', 'g-1']]),
    );
    expect(out.matched).toEqual([
      { studentId: 'linked', name: 'Maya', googleUserId: 'g-1' },
      { studentId: 'byEmail', name: 'Ari', googleUserId: 'g-2' },
    ]);
    expect(out.unmatched).toEqual([{ studentId: 'guest', name: 'Guest', reason: 'no_email' }]);
  });

  it('does not let an email match reuse a Google id already claimed by a link', () => {
    const out = matchStudentsByIdentity(
      [
        { studentId: 'linked', name: 'Maya', email: null },
        { studentId: 'sameEmail', name: 'Twin', email: 'maya@school.org' },
      ],
      roster,
      new Map([['linked', 'g-1']]),
    );
    expect(out.matched.map((m) => m.studentId)).toEqual(['linked']);
    expect(out.unmatched).toEqual([{ studentId: 'sameEmail', name: 'Twin', reason: 'duplicate_email' }]);
  });

  it('falls back to email when the linked id is not on this course roster', () => {
    const out = matchStudentsByIdentity(
      [{ studentId: 's', name: 'Ari', email: 'ari@school.org' }],
      roster,
      new Map([['s', 'g-404']]),
    );
    expect(out.matched).toEqual([{ studentId: 's', name: 'Ari', googleUserId: 'g-2' }]);
  });

  it('behaves exactly like email matching with no links', () => {
    const out = matchStudentsByIdentity([{ studentId: 's', name: 'X', email: 'nobody@x.org' }], roster, new Map());
    expect(out.unmatched).toEqual([{ studentId: 's', name: 'X', reason: 'not_in_course' }]);
  });
});
