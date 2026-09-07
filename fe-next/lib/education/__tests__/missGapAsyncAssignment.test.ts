import { describe, it, expect } from 'vitest';
import {
  buildMissGapAssignmentPath,
  buildMissGapAssignmentShareUrl,
  buildMissGapAssignmentGoogleClassroomUrl,
  buildMissGapClassKey,
  defaultMissGapDueDate,
  normalizeDueDate,
  toMissGapAssignmentPayload,
  isDueDateOnOrAfter,
} from '../missGapAsyncAssignment';

const input = {
  locale: 'en',
  lessonNames: ['Physics 101'],
  teacherName: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-11',
};

describe('missGapAsyncAssignment', () => {
  it('normalizes valid due dates and rejects garbage', () => {
    expect(normalizeDueDate('2026-09-11')).toBe('2026-09-11');
    expect(normalizeDueDate('2026-13-40')).toBe('');
    expect(normalizeDueDate('tomorrow')).toBe('');
    expect(normalizeDueDate('2026-09-11T12:00:00Z')).toBe('');
  });

  it('defaults due date to +3 UTC days', () => {
    expect(defaultMissGapDueDate(new Date('2026-09-08T15:00:00Z'))).toBe('2026-09-11');
  });

  it('builds an absolute async homework URL with due= (not Unplugged Live)', () => {
    const url = buildMissGapAssignmentShareUrl(input);
    expect(url.startsWith('https://www.lexiclash.live/en/education/miss-gap-assignment?')).toBe(
      true,
    );
    const u = new URL(url);
    expect(u.searchParams.get('due')).toBe('2026-09-11');
    expect(u.searchParams.get('missed')).toBe('neutron,quark');
    expect(url).not.toContain('unplugged-reteach');
    expect(url).not.toContain('Maya');
    expect(url).not.toContain('lexiclash.com');
  });

  it('builds a relative in-app path', () => {
    const path = buildMissGapAssignmentPath(input);
    expect(path.startsWith('/en/education/miss-gap-assignment?')).toBe(true);
    expect(path).toContain('due=2026-09-11');
  });

  it('builds Google Classroom assignment share pointing at async homework', () => {
    const url = buildMissGapAssignmentGoogleClassroomUrl({
      input,
      title: 'Async miss-gap — Physics 101',
      body: 'Practice neutron, quark by 2026-09-11',
    });
    expect(url.startsWith('https://classroom.google.com/share?')).toBe(true);
    const u = new URL(url);
    expect(u.searchParams.get('itemtype')).toBe('assignment');
    const join = u.searchParams.get('url') || '';
    expect(join).toContain('/education/miss-gap-assignment');
    expect(join).toContain('due=2026-09-11');
    expect(join).not.toContain('unplugged-reteach');
  });

  it('payload carries dueDate and class key has no student names', () => {
    const payload = toMissGapAssignmentPayload(input);
    expect(payload.dueDate).toBe('2026-09-11');
    expect(payload.missedWords).toEqual(['neutron', 'quark']);
    expect(buildMissGapClassKey(payload)).toBe('physics 101::ms. cohen');
    expect(buildMissGapClassKey(payload)).not.toContain('Maya');
  });

  it('on-time check: completion on/before due contributes', () => {
    expect(isDueDateOnOrAfter('2026-09-11', '2026-09-11')).toBe(true);
    expect(isDueDateOnOrAfter('2026-09-11', '2026-09-10')).toBe(true);
    expect(isDueDateOnOrAfter('2026-09-11', '2026-09-12')).toBe(false);
  });
});
