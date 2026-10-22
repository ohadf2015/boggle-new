import { describe, it, expect } from 'vitest';
import {
  pickActivationNudge,
  planActivationNudges,
  MAX_DAYS_SINCE_APPROVAL,
  type ActivationNudgeRow,
} from '../activationNudge';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-10-23T09:55:00.000Z');
const approvedDaysAgo = (days: number) => new Date(NOW - days * DAY).toISOString();

const row = (over: Partial<ActivationNudgeRow> = {}): ActivationNudgeRow => ({
  id: 'r1',
  user_id: 'u1',
  email: 'ada@school.edu',
  full_name: 'Ada',
  locale: 'en',
  reviewed_at: approvedDaysAgo(1),
  activation_nudges_sent: [],
  ...over,
});

const noExclusions = {
  classroomTeacherIds: new Set<string>(),
  testUserIds: new Set<string>(),
  proUserIds: new Set<string>(),
};

describe('pickActivationNudge', () => {
  it('says nothing on the day of approval', () => {
    expect(pickActivationNudge(approvedDaysAgo(0.5), [], NOW)).toBeNull();
  });

  it('nudges on day 1, then day 3, then day 7', () => {
    expect(pickActivationNudge(approvedDaysAgo(1), [], NOW)).toBe('d1');
    expect(pickActivationNudge(approvedDaysAgo(3), ['d1'], NOW)).toBe('d3');
    expect(pickActivationNudge(approvedDaysAgo(7), ['d1', 'd3'], NOW)).toBe('d7');
  });

  it('never repeats a bucket', () => {
    expect(pickActivationNudge(approvedDaysAgo(2), ['d1'], NOW)).toBeNull();
    expect(pickActivationNudge(approvedDaysAgo(9), ['d1', 'd3', 'd7'], NOW)).toBeNull();
  });

  it('sends only the latest due bucket after a missed run', () => {
    expect(pickActivationNudge(approvedDaysAgo(8), [], NOW)).toBe('d7');
    expect(pickActivationNudge(approvedDaysAgo(8), ['d7'], NOW)).toBeNull();
  });

  it('leaves approvals older than the window alone', () => {
    expect(pickActivationNudge(approvedDaysAgo(MAX_DAYS_SINCE_APPROVAL + 1), [], NOW)).toBeNull();
    expect(pickActivationNudge(approvedDaysAgo(MAX_DAYS_SINCE_APPROVAL - 1), ['d1', 'd3'], NOW)).toBe('d7');
  });

  it('ignores a missing or unparseable approval date', () => {
    expect(pickActivationNudge(null, [], NOW)).toBeNull();
    expect(pickActivationNudge('not-a-date', [], NOW)).toBeNull();
  });
});

describe('planActivationNudges', () => {
  it('plans one nudge for an approved teacher with no class', () => {
    const plan = planActivationNudges([row()], noExclusions, NOW);
    expect(plan.due).toHaveLength(1);
    expect(plan.due[0]).toMatchObject({ email: 'ada@school.edu', bucket: 'd1', rowIds: ['r1'], locale: 'en' });
  });

  it('skips a teacher who already made a classroom', () => {
    const plan = planActivationNudges([row()], { ...noExclusions, classroomTeacherIds: new Set(['u1']) }, NOW);
    expect(plan.due).toHaveLength(0);
    expect(plan.skipped.hasClassroom).toBe(1);
  });

  it('skips test accounts by profile flag and by address', () => {
    const plan = planActivationNudges(
      [row(), row({ id: 'r2', user_id: null, email: 'qa-run@lexiclash.test' })],
      { ...noExclusions, testUserIds: new Set(['u1']) },
      NOW,
    );
    expect(plan.due).toHaveLength(0);
    expect(plan.skipped.testAccount).toBe(2);
  });

  it('skips a teacher who already has Pro', () => {
    const plan = planActivationNudges([row()], { ...noExclusions, proUserIds: new Set(['u1']) }, NOW);
    expect(plan.due).toHaveLength(0);
    expect(plan.skipped.hasPro).toBe(1);
  });

  it('still nudges an approved applicant who never signed in', () => {
    const plan = planActivationNudges([row({ user_id: null })], noExclusions, NOW);
    expect(plan.due).toHaveLength(1);
  });

  it('collapses duplicate rows for one address into a single send that marks every row', () => {
    const plan = planActivationNudges(
      [row({ id: 'a' }), row({ id: 'b', email: ' ADA@school.edu ', user_id: 'u2' })],
      noExclusions,
      NOW,
    );
    expect(plan.due).toHaveLength(1);
    expect(plan.due[0].rowIds.sort()).toEqual(['a', 'b']);
  });

  it('never resends a bucket recorded on a sibling row of the same address', () => {
    const plan = planActivationNudges(
      [row({ id: 'a', activation_nudges_sent: ['d1'] }), row({ id: 'b', reviewed_at: approvedDaysAgo(2) })],
      noExclusions,
      NOW,
    );
    expect(plan.due).toHaveLength(0);
  });

  it('carries the union of sent buckets forward so marking keeps history', () => {
    const plan = planActivationNudges(
      [row({ id: 'a', activation_nudges_sent: ['d1'], reviewed_at: approvedDaysAgo(3) }), row({ id: 'b' })],
      noExclusions,
      NOW,
    );
    expect(plan.due[0].bucket).toBe('d3');
    expect(plan.due[0].alreadySent).toEqual(['d1']);
  });

  it('excludes the whole address when any of its accounts has a class', () => {
    const plan = planActivationNudges(
      [row({ id: 'a', user_id: null }), row({ id: 'b', user_id: 'u2' })],
      { ...noExclusions, classroomTeacherIds: new Set(['u2']) },
      NOW,
    );
    expect(plan.due).toHaveLength(0);
  });

  it('falls back to English for a locale it does not know', () => {
    const plan = planActivationNudges([row({ locale: 'xx' })], noExclusions, NOW);
    expect(plan.due[0].locale).toBe('en');
  });
});
