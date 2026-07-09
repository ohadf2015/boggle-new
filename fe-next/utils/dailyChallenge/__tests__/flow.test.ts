/**
 * Daily Flow Session Tests
 *
 * The Daily Flow chains the day's challenges into a single "one tap" run so a
 * player doesn't have to bounce back to the hub and re-arm a fresh CTA for each
 * mode. This covers the pure step/progress helpers and the localStorage-backed
 * session lifecycle (start → pause → resume → complete → daily reset).
 */

import {
  nextFlowStep,
  flowProgress,
  isFlowComplete,
  startDailyFlow,
  getDailyFlowSession,
  pauseDailyFlow,
  resumeDailyFlow,
  clearDailyFlow,
  type DailyFlowSession,
} from '../flow';

// Deterministic "today" so date-staleness logic is testable.
vi.mock('../dateUtils', () => ({
  getDailyChallengeDate: vi.fn(() => '2025-01-20'),
}));

const makeSession = (over: Partial<DailyFlowSession> = {}): DailyFlowSession => ({
  date: '2025-01-20',
  language: 'en',
  steps: ['word-hunt', 'word-wheel'],
  fast: false,
  status: 'active',
  startedAt: '2025-01-20T00:00:00.000Z',
  ...over,
});

describe('nextFlowStep', () => {
  it('returns the first step that has not been played', () => {
    const s = makeSession();
    expect(nextFlowStep(s, { 'word-hunt': false, 'word-wheel': false })).toBe('word-hunt');
    expect(nextFlowStep(s, { 'word-hunt': true, 'word-wheel': false })).toBe('word-wheel');
  });

  it('treats a missing played entry as not played', () => {
    const s = makeSession();
    expect(nextFlowStep(s, {})).toBe('word-hunt');
  });

  it('returns null when every step is played', () => {
    const s = makeSession();
    expect(nextFlowStep(s, { 'word-hunt': true, 'word-wheel': true })).toBeNull();
  });
});

describe('flowProgress', () => {
  it('counts played steps against the total', () => {
    const s = makeSession();
    expect(flowProgress(s, { 'word-hunt': true, 'word-wheel': false })).toEqual({ done: 1, total: 2 });
    expect(flowProgress(s, { 'word-hunt': true, 'word-wheel': true })).toEqual({ done: 2, total: 2 });
  });
});

describe('isFlowComplete', () => {
  it('is true only once all steps are played', () => {
    const s = makeSession();
    expect(isFlowComplete(s, { 'word-hunt': true, 'word-wheel': false })).toBe(false);
    expect(isFlowComplete(s, { 'word-hunt': true, 'word-wheel': true })).toBe(true);
  });

  it('is false for an empty step list (nothing to complete)', () => {
    const s = makeSession({ steps: [] });
    expect(isFlowComplete(s, {})).toBe(false);
  });
});

describe('session lifecycle', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts an active session and persists it', () => {
    const session = startDailyFlow({ language: 'en', steps: ['word-hunt', 'word-wheel'], fast: true });
    expect(session.status).toBe('active');
    expect(session.fast).toBe(true);
    expect(session.date).toBe('2025-01-20');

    const loaded = getDailyFlowSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.steps).toEqual(['word-hunt', 'word-wheel']);
    expect(loaded?.fast).toBe(true);
  });

  it('pauses and resumes the active session', () => {
    startDailyFlow({ language: 'en', steps: ['word-hunt', 'word-wheel'], fast: false });
    pauseDailyFlow();
    expect(getDailyFlowSession()?.status).toBe('paused');
    resumeDailyFlow();
    expect(getDailyFlowSession()?.status).toBe('active');
  });

  it('clears the session', () => {
    startDailyFlow({ language: 'en', steps: ['word-hunt'], fast: false });
    clearDailyFlow();
    expect(getDailyFlowSession()).toBeNull();
  });

  it('discards a stale session from a previous day', () => {
    startDailyFlow({ language: 'en', steps: ['word-hunt'], fast: false, date: '2025-01-19' });
    // Stored date (yesterday) !== mocked today (2025-01-20) → treated as gone.
    expect(getDailyFlowSession()).toBeNull();
  });
});
