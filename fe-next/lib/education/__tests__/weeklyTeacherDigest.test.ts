import { describe, it, expect } from 'vitest';
import {
  assembleWeeklyDigests,
  buildWeeklyTeacherDigest,
  isoWeekKey,
  shouldSendWeeklyDigest,
} from '../weeklyTeacherDigest';

const NOW = Date.parse('2026-09-23T12:00:00.000Z');

describe('isoWeekKey', () => {
  it('returns the ISO week for a Wednesday', () => {
    expect(isoWeekKey(NOW)).toBe('2026-W39');
  });
});

describe('buildWeeklyTeacherDigest', () => {
  it('folds each classroom into 7d completion/accuracy', () => {
    const digest = buildWeeklyTeacherDigest({
      teacherId: 't1',
      email: 'ada@school.edu',
      fullName: 'Ada',
      locale: 'en',
      hasPro: false,
      now: NOW,
      classrooms: [
        {
          classroomId: 'c1',
          classroomName: 'Year 7',
          roster: [
            { studentId: 's1', name: 'Sam' },
            { studentId: 's2', name: 'Pat' },
          ],
          sessions: [
            {
              studentId: 's1',
              completedAt: new Date(NOW - 86400000).toISOString(),
              foundCount: 8,
              missedCount: 2,
            },
          ],
        },
      ],
    });
    expect(digest.classrooms).toHaveLength(1);
    expect(digest.classrooms[0].progress.completionPct).toBe(50);
    expect(digest.classrooms[0].progress.accuracyPct).toBe(80);
    expect(shouldSendWeeklyDigest(digest)).toBe(true);
  });

  it('does not send when the teacher has no classrooms', () => {
    const digest = buildWeeklyTeacherDigest({
      teacherId: 't1',
      email: 'ada@school.edu',
      fullName: 'Ada',
      locale: 'en',
      hasPro: false,
      classrooms: [],
    });
    expect(shouldSendWeeklyDigest(digest)).toBe(false);
  });
});

describe('assembleWeeklyDigests', () => {
  it('dedupes teachers by email and skips empty classrooms', () => {
    const now = Date.parse('2026-09-23T12:00:00.000Z');
    const digests = assembleWeeklyDigests({
      now,
      teachers: [
        { userId: 't1', email: 'Ada@school.edu', fullName: 'Ada', locale: 'en' },
        { userId: 't1b', email: 'ada@school.edu', fullName: 'Ada 2', locale: 'en' },
        { userId: 't2', email: 'bob@school.edu', fullName: 'Bob', locale: 'en' },
      ],
      classrooms: [{ id: 'c1', name: 'Year 7', teacherId: 't1' }],
      memberships: [{ classroomId: 'c1', studentId: 's1' }],
      sessions: [
        {
          classroomId: 'c1',
          studentId: 's1',
          completedAt: new Date(now - 86400000).toISOString(),
          foundCount: 1,
          missedCount: 0,
        },
      ],
      proUserIds: new Set(['t1']),
    });
    expect(digests).toHaveLength(1);
    expect(digests[0].email).toBe('Ada@school.edu');
    expect(digests[0].hasPro).toBe(true);
    expect(digests[0].classrooms[0].progress.activeCount).toBe(1);
  });
});
