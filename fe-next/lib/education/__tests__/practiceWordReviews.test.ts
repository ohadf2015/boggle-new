import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRecord = vi.fn();
vi.mock('../recordWordReviews', () => ({ recordWordReviews: (...a: unknown[]) => mockRecord(...a) }));
const mockLogger = vi.hoisted(() => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }));
vi.mock('@/utils/logger', () => ({ default: mockLogger }));

import { allowedReviewKinds, recordPracticeWordReviews } from '../practiceWordReviews';

function admin(lesson: unknown, error: { message: string } | null = null) {
  const calls: Array<[string, ...unknown[]]> = [];
  const builder = {
    select: (...a: unknown[]) => (calls.push(['select', ...a]), builder),
    eq: (...a: unknown[]) => (calls.push(['eq', ...(a as [string])]), builder),
    maybeSingle: async () => ({ data: error ? null : lesson, error }),
  };
  return { client: { from: (t: string) => (calls.push(['from', t]), builder) }, calls };
}

const NOW = Date.UTC(2026, 10, 28, 23, 30);
const results = [{ word: 'cat', correct: true, kind: 'spell' as const }];

describe('recordPracticeWordReviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRecord.mockResolvedValue({ recorded: 1, dropped: 0, mastered: [] });
  });

  it('GIVEN results WHEN recorded THEN the lesson words come from the server (service role), and the day is UTC', async () => {
    const a = admin({ language: 'en', words: [{ word: 'cat' }, 'dog', { word: '' }] });
    await recordPracticeWordReviews(() => a.client as never, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: results, nowMs: NOW });
    expect(a.calls).toContainEqual(['from', 'vocabulary_lessons']);
    expect(a.calls).toContainEqual(['eq', 'id', 'l1']);
    expect(mockRecord).toHaveBeenCalledWith(a.client, {
      studentId: 's1',
      lessonId: 'l1',
      lesson: { language: 'en', words: ['cat', 'dog'] },
      reviews: results,
      today: '2026-11-28',
    });
  });

  it('GIVEN no results WHEN called THEN nothing is read or written', async () => {
    const getAdmin = vi.fn();
    await recordPracticeWordReviews(getAdmin, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: undefined, nowMs: NOW });
    await recordPracticeWordReviews(getAdmin, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: [], nowMs: NOW });
    expect(getAdmin).not.toHaveBeenCalled();
    expect(mockRecord).not.toHaveBeenCalled();
  });

  it('GIVEN no service-role client WHEN called THEN it logs an error instead of silently skipping', async () => {
    await recordPracticeWordReviews(() => null, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: results, nowMs: NOW });
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('GIVEN the lesson is gone or unreadable WHEN called THEN it logs and records nothing', async () => {
    await recordPracticeWordReviews(() => admin(null).client as never, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: results, nowMs: NOW });
    await recordPracticeWordReviews(() => admin(null, { message: 'x' }).client as never, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: results, nowMs: NOW });
    expect(mockRecord).not.toHaveBeenCalled();
    expect(mockLogger.error).toHaveBeenCalledTimes(2);
  });

  it('GIVEN the engine throws WHEN called THEN the error is logged, never thrown', async () => {
    mockRecord.mockRejectedValueOnce(new Error('write failed'));
    const a = admin({ language: 'en', words: ['cat'] });
    await expect(recordPracticeWordReviews(() => a.client as never, { studentId: 's1', lessonId: 'l1', practiceType: 'spelling', mode: null, wordResults: results, nowMs: NOW })).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it.each([
    ['flashcard', null, ['recognise', 'context']],
    ['flashcard', 'missed_review', ['recognise', 'spell']],
    ['matching', null, ['recognise']],
    ['vocab_focus', 'vocab_focus', ['recognise', 'context', 'recall']],
    ['spelling', null, ['spell']],
    ['blitz', null, ['recall', 'spell']],
    ['solo_board', 'wordcraft', ['find']],
    ['warmup', null, ['find']],
    ['daily_quest', null, ['recognise', 'context', 'spell', 'recall', 'use']],
    ['word_list', null, []],
  ] as const)('GIVEN a %s session (mode %s) THEN only %j answers count', (type, mode, kinds) => {
    expect([...allowedReviewKinds(type, mode)].sort()).toEqual([...kinds].sort());
  });

  it('GIVEN a client claiming a harder kind than its mode can ask WHEN recorded THEN that answer is dropped', async () => {
    const a = admin({ language: 'en', words: ['cat', 'dog'] });
    await recordPracticeWordReviews(() => a.client as never, {
      studentId: 's1',
      lessonId: 'l1',
      practiceType: 'flashcard',
      mode: null,
      wordResults: [{ word: 'cat', correct: true, kind: 'use' }, { word: 'dog', correct: true, kind: 'recognise' }],
      nowMs: NOW,
    });
    expect(mockRecord.mock.calls[0][1].reviews).toEqual([{ word: 'dog', correct: true, kind: 'recognise' }]);
  });

  it('GIVEN only disallowed kinds WHEN recorded THEN nothing is read or written', async () => {
    const getAdmin = vi.fn();
    await recordPracticeWordReviews(getAdmin, { studentId: 's1', lessonId: 'l1', practiceType: 'matching', mode: null, wordResults: [{ word: 'cat', correct: true, kind: 'spell' }], nowMs: NOW });
    expect(getAdmin).not.toHaveBeenCalled();
  });
});

