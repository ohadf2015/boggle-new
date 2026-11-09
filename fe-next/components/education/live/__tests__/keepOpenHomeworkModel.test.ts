import { describe, it, expect } from 'vitest';
import { KEEP_OPEN_DAYS, openHomeworkFor } from '../keepOpenHomeworkModel';

const row = (lesson_id: string, due_date: string | null) => ({ lesson_id, due_date });

describe('openHomeworkFor', () => {
  it('keeps the week a school week', () => {
    expect(KEEP_OPEN_DAYS).toBe(7);
  });

  it('Given the lesson is already homework due later, Then it is open until that day', () => {
    expect(openHomeworkFor([row('l-1', '2026-11-16')], 'l-1', '2026-11-09')).toEqual({ due: '2026-11-16' });
  });

  it('Given an assignment with no due date, Then it is open with no end', () => {
    expect(openHomeworkFor([row('l-1', null)], 'l-1', '2026-11-09')).toEqual({ due: null });
  });

  it('Given the lesson homework is past due, Then it is not open', () => {
    expect(openHomeworkFor([row('l-1', '2026-11-08')], 'l-1', '2026-11-09')).toBeNull();
  });

  it('Given a due date stored as a full timestamp on the same day, Then it still counts as open today', () => {
    expect(openHomeworkFor([row('l-1', '2026-11-09T21:59:59.000Z')], 'l-1', '2026-11-09')).toEqual({ due: '2026-11-09' });
  });

  it('Given homework for another lesson only, Then this lesson is not open', () => {
    expect(openHomeworkFor([row('l-2', '2026-11-20')], 'l-1', '2026-11-09')).toBeNull();
  });
});
