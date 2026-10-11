import { describe, it, expect } from 'vitest';
import {
  classifyAssignmentDue,
  daysOverdue,
  isOverdueNudgeDue,
  markOverdueNudged,
  overdueNudgeStorageKey,
  DUE_REMINDER_WINDOW_MS,
  OVERDUE_NUDGE_TTL_MS,
} from '../assignmentDueReminder';

const NOW = Date.parse('2026-10-11T12:00:00.000Z');

function iso(msFromNow: number): string {
  return new Date(NOW + msFromNow).toISOString();
}

describe('classifyAssignmentDue', () => {
  it('returns overdue when the due date has passed', () => {
    expect(classifyAssignmentDue(iso(-60_000), NOW)).toBe('overdue');
  });

  it('returns due_soon inside the 24h window (edges included)', () => {
    expect(classifyAssignmentDue(iso(DUE_REMINDER_WINDOW_MS), NOW)).toBe('due_soon');
    expect(classifyAssignmentDue(iso(60_000), NOW)).toBe('due_soon');
  });

  it('returns null when the due date is beyond the window', () => {
    expect(classifyAssignmentDue(iso(DUE_REMINDER_WINDOW_MS + 60_000), NOW)).toBeNull();
  });

  it('returns null for missing or unparseable due dates', () => {
    expect(classifyAssignmentDue(null, NOW)).toBeNull();
    expect(classifyAssignmentDue('', NOW)).toBeNull();
    expect(classifyAssignmentDue('not-a-date', NOW)).toBeNull();
  });
});

describe('daysOverdue', () => {
  it('is 1 for a freshly overdue assignment', () => {
    expect(daysOverdue(iso(-60_000), NOW)).toBe(1);
  });

  it('counts whole days past the due date', () => {
    expect(daysOverdue(iso(-2 * OVERDUE_NUDGE_TTL_MS - 60_000), NOW)).toBe(2);
    expect(daysOverdue(iso(-3 * OVERDUE_NUDGE_TTL_MS), NOW)).toBe(3);
  });
});

describe('overdue nudge throttle', () => {
  function memoryStorage(): {
    getItem(k: string): string | null;
    setItem(k: string, v: string): void;
  } {
    const map = new Map<string, string>();
    return {
      getItem: (k) => map.get(k) ?? null,
      setItem: (k, v) => void map.set(k, v),
    };
  }

  it('allows the first nudge and blocks the same day', () => {
    const storage = memoryStorage();
    expect(isOverdueNudgeDue(storage, 'a1', NOW)).toBe(true);
    markOverdueNudged(storage, 'a1', NOW);
    expect(isOverdueNudgeDue(storage, 'a1', NOW + 60_000)).toBe(false);
    expect(isOverdueNudgeDue(storage, 'a1', NOW + OVERDUE_NUDGE_TTL_MS)).toBe(true);
  });

  it('throttles per assignment, not globally', () => {
    const storage = memoryStorage();
    markOverdueNudged(storage, 'a1', NOW);
    expect(isOverdueNudgeDue(storage, 'a2', NOW)).toBe(true);
  });

  it('nudges again after the TTL — repeatable, max 1/day', () => {
    const storage = memoryStorage();
    markOverdueNudged(storage, 'a1', NOW);
    expect(isOverdueNudgeDue(storage, 'a1', NOW + OVERDUE_NUDGE_TTL_MS - 1)).toBe(false);
    expect(isOverdueNudgeDue(storage, 'a1', NOW + OVERDUE_NUDGE_TTL_MS)).toBe(true);
  });

  it('treats corrupt or unreadable storage as due', () => {
    expect(isOverdueNudgeDue(null, 'a1', NOW)).toBe(true);
    const weird = { getItem: () => 'garbage' };
    expect(isOverdueNudgeDue(weird, 'a1', NOW)).toBe(true);
    const throwing = {
      getItem() {
        throw new Error('denied');
      },
    };
    expect(isOverdueNudgeDue(throwing, 'a1', NOW)).toBe(true);
  });

  it('uses a per-assignment storage key', () => {
    expect(overdueNudgeStorageKey('a1')).toBe('lexiclash.assignment_overdue_nudged.a1');
  });
});
