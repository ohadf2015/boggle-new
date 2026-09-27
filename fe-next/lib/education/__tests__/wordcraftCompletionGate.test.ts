import { describe, it, expect, vi } from 'vitest';

vi.mock('@/utils/logger', () => ({
  __esModule: true,
  default: { log: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

import { gateWordCraftCompletion } from '../wordcraftCompletionGate';

/**
 * Server-side bar for Word Craft homework. The game runs on the client, so the
 * DATA (words built) is client-reported — but the DECISION is made here: lesson
 * words are re-checked against the lesson's own words, and a round below the
 * bar is recorded as an attempt, never a completion.
 */
function adminWith(lesson: { words: Array<{ word: string }>; language: string } | null, error: unknown = null) {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: lesson, error }),
    })),
  } as never;
}

const HE_LESSON = { words: [{ word: 'שלום' }, { word: 'ספר' }], language: 'he' };
const base = { requested: true, sessionMode: 'wordcraft', lessonId: 'L1' };

describe('gateWordCraftCompletion', () => {
  it('Given a non-Word-Craft session, When gated, Then the request passes through untouched (no lesson read)', async () => {
    const admin = adminWith(HE_LESSON);
    expect(await gateWordCraftCompletion(admin, { ...base, sessionMode: null })).toEqual({ completed: true });
    expect(await gateWordCraftCompletion(admin, { ...base, requested: false })).toEqual({ completed: false });
    expect((admin as unknown as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled();
  });

  it('Given a zero-word round (passed straight away), When gated, Then it records as attempted, not completed', async () => {
    const out = await gateWordCraftCompletion(adminWith(HE_LESSON), { ...base, vocabularyWordsFound: [], wordsFound: [] });
    expect(out.completed).toBe(false);
    expect(out.results).toEqual({ outcome: 'attempted', lessonWords: 0, validWords: 0 });
  });

  it('Given a Hebrew lesson word built with regular letters (no final form), When gated, Then it matches and completes', async () => {
    const out = await gateWordCraftCompletion(adminWith(HE_LESSON), { ...base, wordsFound: ['שלומ'] });
    expect(out.completed).toBe(true);
    expect(out.vocabularyWordsFound).toEqual(['שלומ']);
    // A replay that completes overwrites the earlier attempt's marker.
    expect(out.results).toEqual({ outcome: 'completed', lessonWords: 1, validWords: 1 });
  });

  it('Given a client-claimed "lesson word" the lesson does not contain, When gated, Then it is not trusted', async () => {
    const out = await gateWordCraftCompletion(adminWith(HE_LESSON), {
      ...base, vocabularyWordsFound: ['FAKE'], wordsFound: ['FAKE'],
    });
    expect(out.completed).toBe(false);
    expect(out.vocabularyWordsFound).toEqual([]);
  });

  it('Given three distinct valid words and no lesson word, When gated, Then it completes', async () => {
    const out = await gateWordCraftCompletion(adminWith(HE_LESSON), { ...base, wordsFound: ['אבא', 'גן', 'דג'] });
    expect(out.completed).toBe(true);
  });

  it('Given the lesson cannot be read, When gated, Then the lesson leg fails closed but the valid-word leg still works', async () => {
    const out = await gateWordCraftCompletion(adminWith(null, { message: 'boom' }), { ...base, wordsFound: ['שלומ'] });
    expect(out.completed).toBe(false);
    const three = await gateWordCraftCompletion(null, { ...base, wordsFound: ['A1', 'B2', 'C3'] });
    expect(three.completed).toBe(true);
  });
});
