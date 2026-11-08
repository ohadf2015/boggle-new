import { describe, it, expect } from 'vitest';
import { classifyEngagement, NEVER_PLAYED_MAX_SEC, subModeLabel, engagementTag } from '../engagement';

const base = {
  isAutomated: false,
  status: 'abandoned' as const,
  score: 0,
  wordCount: 0,
  floors: null as number | null,
  durationSec: null as number | null,
};

describe('classifyEngagement', () => {
  it('flags headless/automated plays as bot, whatever they scored', () => {
    expect(classifyEngagement({ ...base, isAutomated: true, durationSec: 3 })).toBe('bot');
    expect(classifyEngagement({ ...base, isAutomated: true, status: 'completed', score: 50 })).toBe('bot');
  });

  it('counts any score, word or floor as played', () => {
    expect(classifyEngagement({ ...base, wordCount: 1, durationSec: 4 })).toBe('played');
    expect(classifyEngagement({ ...base, status: 'completed', score: 12 })).toBe('played');
    expect(classifyEngagement({ ...base, floors: 2, durationSec: 40 })).toBe('played');
  });

  it(`reads a leave under ${NEVER_PLAYED_MAX_SEC}s with nothing found as never played`, () => {
    expect(classifyEngagement({ ...base, durationSec: 3 })).toBe('never_played');
    expect(classifyEngagement({ ...base, durationSec: NEVER_PLAYED_MAX_SEC - 1 })).toBe('never_played');
  });

  it('a longer leave with nothing recorded is a left-early game, not "never played"', () => {
    expect(classifyEngagement({ ...base, durationSec: NEVER_PLAYED_MAX_SEC })).toBe('left_early');
    expect(classifyEngagement({ ...base, durationSec: 240 })).toBe('left_early');
  });

  it('an abandon with no duration recorded is left early (cannot prove it never started)', () => {
    expect(classifyEngagement({ ...base, durationSec: null })).toBe('left_early');
  });

  it('a finished game with zero score and words is finished_empty', () => {
    expect(classifyEngagement({ ...base, status: 'completed', durationSec: 90 })).toBe('finished_empty');
  });

  it('an errored game with nothing found is never treated as played', () => {
    expect(classifyEngagement({ ...base, status: 'errored', durationSec: 30 })).toBe('left_early');
  });
});

describe('subModeLabel', () => {
  it('names the single-player sub-modes in plain words', () => {
    expect(subModeLabel('challenge')).toBe('Timed solo');
    expect(subModeLabel('solo-bots')).toBe('vs bots');
    expect(subModeLabel('practice')).toBe('Untimed practice');
  });

  it('falls back to the raw value, and to null when absent', () => {
    expect(subModeLabel('weird-mode')).toBe('weird-mode');
    expect(subModeLabel(null)).toBeNull();
  });
});

describe('engagementTag', () => {
  const t = (_k: string, fallback?: string) => fallback ?? _k;
  const tag = (engagement: Parameters<typeof engagementTag>[0]['engagement'], status: 'completed' | 'abandoned' | 'errored', durationSec: number | null = null) =>
    engagementTag({ engagement, status, durationSec }, t);

  it('says what happened in plain words', () => {
    expect(tag('bot', 'abandoned', 3)).toEqual({ label: 'Bot', tone: 'bot' });
    expect(tag('never_played', 'abandoned', 3).label).toBe('Left after 3s · never played');
    expect(tag('left_early', 'abandoned', 83).label).toBe('Left after 1:23');
    expect(tag('finished_empty', 'completed', 90).label).toBe('Finished · 0 words');
    expect(tag('played', 'completed', 90)).toEqual({ label: 'Completed', tone: 'done' });
    expect(tag('played', 'abandoned', 45)).toEqual({ label: 'Left after 45s', tone: 'left' });
    expect(tag('played', 'errored', 45).tone).toBe('error');
  });

  it('falls back to "Left mid-game" with no duration, and copes with old rows lacking engagement', () => {
    expect(tag('left_early', 'abandoned', null).label).toBe('Left mid-game');
    expect(tag(undefined, 'completed').label).toBe('Completed');
  });
});
