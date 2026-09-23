import { describe, it, expect } from 'vitest';
import { teacherWeeklyProgressDigest } from '../teacherWeeklyProgressDigest';
import { buildWeeklyTeacherDigest } from '@/lib/education/weeklyTeacherDigest';

const NOW = Date.parse('2026-09-23T12:00:00.000Z');

const digest = buildWeeklyTeacherDigest({
  teacherId: 't1',
  email: 'ada@school.edu',
  fullName: 'Ada Lovelace',
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

describe('teacherWeeklyProgressDigest', () => {
  it('links the Polar upgrade CTA at /en/teacher/upgrade', () => {
    const { subject, html } = teacherWeeklyProgressDigest(digest);
    expect(subject).toContain('class this week');
    expect(html).toContain('https://www.lexiclash.live/en/teacher/upgrade');
    expect(html).toContain('Start Teacher Pro');
    expect(html).toContain('Year 7');
    expect(html).toContain('50%');
    expect(html).toContain('80%');
  });

  it('omits the Polar CTA for a Pro teacher', () => {
    const { html } = teacherWeeklyProgressDigest({ ...digest, hasPro: true });
    expect(html).not.toContain('/teacher/upgrade');
    expect(html).toContain('https://www.lexiclash.live/en/teacher');
  });

  it('renders Hebrew RTL', () => {
    const { html, subject } = teacherWeeklyProgressDigest({ ...digest, locale: 'he', fullName: 'מורה' });
    expect(html).toContain('dir="rtl"');
    expect(subject).toContain('הכיתה');
  });

  it('escapes a hostile classroom name', () => {
    const hostile = teacherWeeklyProgressDigest(
      buildWeeklyTeacherDigest({
        ...digest,
        classrooms: [
          {
            classroomId: 'c1',
            classroomName: '<script>alert(1)</script>',
            roster: [{ studentId: 's1', name: 'Sam' }],
            sessions: [],
          },
        ],
      }),
    );
    expect(hostile.html).not.toContain('<script>');
    expect(hostile.html).toContain('&lt;script&gt;');
  });
});
