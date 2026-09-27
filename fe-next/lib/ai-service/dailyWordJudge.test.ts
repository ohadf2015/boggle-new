import { describe, it, expect, vi } from 'vitest';
import {
  buildDailyWordJudgePrompt,
  parseDailyWordJudgeResponse,
  judgeDailyWord,
} from './dailyWordJudge';
import { createTokenUsageStats } from './client';

const passThroughTimeout = <T,>(p: Promise<T>) => p;

function mockModel(text: string) {
  return {
    generateContent: vi.fn().mockResolvedValue({
      response: { candidates: [{ content: { parts: [{ text }] } }] },
    }),
  } as never;
}

describe('buildDailyWordJudgePrompt', () => {
  it('includes the word, the language name, and the core rejection rules', () => {
    const prompt = buildDailyWordJudgePrompt('קובורג', 'he');
    expect(prompt).toContain('קובורג');
    expect(prompt).toContain('Hebrew');
    // Same bad-word criteria as the generator (no dual source of truth)
    expect(prompt.toLowerCase()).toContain('proper noun');
    expect(prompt.toLowerCase()).toContain('meaning');
    expect(prompt).toMatch(/"ok"/);
  });
});

describe('parseDailyWordJudgeResponse', () => {
  it('parses plain JSON', () => {
    const v = parseDailyWordJudgeResponse('{"ok":true,"reason":"common","meaning":"a cold sweet treat"}');
    expect(v.ok).toBe(true);
    expect(v.meaning).toBe('a cold sweet treat');
  });

  it('parses markdown-fenced JSON', () => {
    const v = parseDailyWordJudgeResponse('```json\n{"ok":false,"reason":"city name","meaning":""}\n```');
    expect(v.ok).toBe(false);
    expect(v.reason).toBe('city name');
  });

  it('throws when no JSON is present', () => {
    expect(() => parseDailyWordJudgeResponse('the model said hi')).toThrow();
  });
});

describe('judgeDailyWord', () => {
  it('returns a reject verdict for a proper noun', async () => {
    const model = mockModel('{"ok":false,"reason":"German city","meaning":""}');
    const usage = createTokenUsageStats();
    const v = await judgeDailyWord(model, 'קובורג', 'he', passThroughTimeout, usage);
    expect(v.ok).toBe(false);
    expect(usage.totalOutputTokens).toBeGreaterThan(0);
  });

  it('returns ok with a meaning for a common word', async () => {
    const model = mockModel('{"ok":true,"reason":"common noun","meaning":"קינוח קר ומתוק"}');
    const usage = createTokenUsageStats();
    const v = await judgeDailyWord(model, 'גלידה', 'he', passThroughTimeout, usage);
    expect(v.ok).toBe(true);
    expect(v.meaning).toBe('קינוח קר ומתוק');
  });
});
