/**
 * Entry resolution for /education/miss-gap-assignment.
 *
 * Round 4's verdict was "the homework game never loads at all". The route was
 * fine; the ENTRY was. `teacherMode = role === 'teacher' || !dueDate` meant the
 * student game existed only behind a ~300-char query string with `due=` intact
 * — drop or mis-encode one param and the student landed on the teacher's
 * compose card with nothing to play, which reads exactly like a dead link.
 *
 * These tests pin the four entries that must all work.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveMissGapEntry,
  MISS_GAP_DEMO_WORDS,
} from '../missGapEntry';
import { buildMissGapAssignmentShareUrl } from '../missGapAsyncAssignment';

function entry(query: string, locale = 'en') {
  return resolveMissGapEntry(new URLSearchParams(query), locale);
}

describe('resolveMissGapEntry', () => {
  it('given role=student with no due date, when resolved, then it is student mode with a defaulted due date', () => {
    const { teacherMode, payload } = entry('role=student&missed=brave,gleam');

    expect(teacherMode).toBe(false);
    // A student link must never fall through to the compose card just because
    // the due date got stripped in a paste.
    expect(payload.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(payload.missedWords).toEqual(['brave', 'gleam']);
  });

  it('given role=teacher, when resolved, then it is teacher mode even with a due date present', () => {
    const { teacherMode } = entry('role=teacher&missed=brave&due=2099-01-01');

    expect(teacherMode).toBe(true);
  });

  it('given the reteach entry (words, no due, no role), when resolved, then the teacher still gets the compose card', () => {
    const { teacherMode } = entry('missed=brave,gleam&lesson=Week%203');

    expect(teacherMode).toBe(true);
  });

  it('given a bare URL with no params at all, when resolved, then it seeds a playable student assignment', () => {
    const { teacherMode, payload } = entry('');

    expect(teacherMode).toBe(false);
    expect(payload.missedWords.length).toBeGreaterThanOrEqual(4);
    expect(payload.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // Seeded words carry meanings, so the bare URL opens the GOOD round kind
    // (tap the definition), not spelling-only.
    for (const word of payload.missedWords) {
      expect(payload.definitions[word.toLowerCase()]).toBeTruthy();
    }
  });

  it('given a bare URL, when resolved, then the seeded words are the documented demo set', () => {
    const { payload } = entry('');

    expect(payload.missedWords).toEqual(MISS_GAP_DEMO_WORDS.map((w) => w.word));
  });

  it('given a student link built by the share helper, when re-read, then it round-trips to student mode', () => {
    const url = buildMissGapAssignmentShareUrl({
      locale: 'en',
      lesson: 'Week 3 Vocab',
      teacher: 'Ms G',
      missedWords: ['brave', 'gleam'],
      found: 8,
      total: 10,
      dueDate: '2099-01-01',
      definitions: { brave: 'not afraid of danger' },
    });
    const { teacherMode, payload } = resolveMissGapEntry(
      new URL(url).searchParams,
      'en',
    );

    expect(teacherMode).toBe(false);
    expect(payload.missedWords).toEqual(['brave', 'gleam']);
    expect(payload.definitions.brave).toBe('not afraid of danger');
  });

  it('given no lang param, when resolved, then the route locale is used', () => {
    const { payload } = entry('role=student&missed=brave', 'he');

    expect(payload.locale).toBe('he');
  });

  it('given an explicit lang param, when resolved, then it wins over the route locale', () => {
    const { payload } = entry('role=student&missed=brave&lang=sv', 'en');

    expect(payload.locale).toBe('sv');
  });
});

describe('buildMissGapAssignmentShareUrl role marker', () => {
  it('given a student share link, when built, then it carries role=student', () => {
    const url = buildMissGapAssignmentShareUrl({
      locale: 'en',
      lesson: 'Week 3',
      teacher: 'Ms G',
      missedWords: ['brave'],
      found: 1,
      total: 2,
      dueDate: '2099-01-01',
    });

    expect(new URL(url).searchParams.get('role')).toBe('student');
  });
});
