/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  readClassStreak,
  recordClassHomeworkCompletion,
  contributesToClassStreak,
  EMPTY_CLASS_STREAK,
} from '../classStreak';

const KEY = 'physics 101::ms. cohen';

describe('classStreak', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('starts empty', () => {
    expect(readClassStreak(KEY)).toEqual(EMPTY_CLASS_STREAK);
  });

  it('on-time completion contributes and grows the streak across consecutive days', () => {
    const first = recordClassHomeworkCompletion({
      classKey: KEY,
      dueDate: '2026-09-10',
      completedOn: '2026-09-09',
    });
    expect(first.contributed).toBe(true);
    expect(first.currentStreak).toBe(1);

    const second = recordClassHomeworkCompletion({
      classKey: KEY,
      dueDate: '2026-09-11',
      completedOn: '2026-09-10',
    });
    expect(second.contributed).toBe(true);
    expect(second.currentStreak).toBe(2);
  });

  it('late completion does not contribute', () => {
    const late = recordClassHomeworkCompletion({
      classKey: KEY,
      dueDate: '2026-09-09',
      completedOn: '2026-09-10',
    });
    expect(late.contributed).toBe(false);
    expect(late.currentStreak).toBe(0);
    expect(contributesToClassStreak('2026-09-09', '2026-09-10')).toBe(false);
  });

  it('same day is idempotent', () => {
    recordClassHomeworkCompletion({
      classKey: KEY,
      dueDate: '2026-09-11',
      completedOn: '2026-09-11',
    });
    const again = recordClassHomeworkCompletion({
      classKey: KEY,
      dueDate: '2026-09-11',
      completedOn: '2026-09-11',
    });
    expect(again.contributed).toBe(false);
    expect(again.currentStreak).toBe(1);
  });
});
