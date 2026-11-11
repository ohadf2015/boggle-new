import { describe, it, expect } from 'vitest';
import { buildQuickShareText, summarizeWords, LTR_ISOLATE, POP_ISOLATE } from '../quickShareText';

const EMOJI = /\p{Extended_Pictographic}/u;

const t = (key: string, params?: Record<string, string>) => {
  if (!params) return key;
  return `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})`;
};

const words = (...list: string[]) => list.map((word) => ({ word, score: word.length }));

describe('summarizeWords', () => {
  it('Given an empty run, When summarized, Then every count is zero', () => {
    expect(summarizeWords([])).toEqual({ count: 0, longest: 0, long: 0 });
  });

  it('Given one word, When summarized, Then it is the longest', () => {
    expect(summarizeWords(words('cat'))).toEqual({ count: 1, longest: 3, long: 0 });
  });

  it('Given short, medium and long words, When summarized, Then 7+ letter words count as long', () => {
    expect(summarizeWords(words('cat', 'stone', 'planets', 'remarkable'))).toEqual({
      count: 4,
      longest: 10,
      long: 2,
    });
  });

  it('Given 200 words, When summarized, Then it counts them all', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ word: i % 2 ? 'strength' : 'tea', score: 1 }));
    expect(summarizeWords(many)).toEqual({ count: 200, longest: 8, long: 100 });
  });

  it('Given Hebrew words with final letters, When summarized, Then length is counted in letters', () => {
    expect(summarizeWords(words('שלום', 'מחשבים'))).toEqual({ count: 2, longest: 6, long: 0 });
  });
});

describe('buildQuickShareText', () => {
  const base = { mode: 'word-hunt' as const, score: 420, scorePct: 73, dayStreak: 0, t };

  it('Given an empty run, When built, Then it says no words and never names a word', () => {
    const text = buildQuickShareText({ ...base, score: 0, scorePct: 0, words: [] });
    expect(text).toContain('quickPlay.solo.recap.noWords');
    expect(text).not.toContain('quickPlay.solo.recap.words(');
  });

  it('Given one word, When built, Then it uses the single-word line and keeps the word secret', () => {
    const text = buildQuickShareText({ ...base, words: words('planet') });
    expect(text).toContain('quickPlay.solo.recap.wordsOne(');
    expect(text).not.toMatch(/planet/i);
  });

  it('Given 200 words with long ones, When built, Then it shows the count, the longest and the long count', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ word: i % 2 ? 'strength' : 'tea', score: 1 }));
    const text = buildQuickShareText({ ...base, words: many });
    expect(text).toContain(`count=${LTR_ISOLATE}200${POP_ISOLATE}`);
    expect(text).toContain(`longest=${LTR_ISOLATE}8${POP_ISOLATE}`);
    expect(text).toContain(`quickPlay.solo.recap.longWords(count=${LTR_ISOLATE}100${POP_ISOLATE})`);
    expect(text).not.toMatch(/strength|tea/);
  });

  it('Given no long words, When built, Then the long-words line is left out', () => {
    const text = buildQuickShareText({ ...base, words: words('cat', 'dog') });
    expect(text).not.toContain('quickPlay.solo.recap.longWords');
  });

  it('Given a header, When built, Then it names the mode and isolates the score numbers', () => {
    const text = buildQuickShareText({ ...base, words: words('cat') });
    const [header, score] = text.split('\n');
    expect(header).toBe('quickPlay.solo.recap.header(mode=quickPlay.solo.mode.word-hunt)');
    expect(score).toContain(`score=${LTR_ISOLATE}420${POP_ISOLATE}`);
    expect(score).toContain(`pct=${LTR_ISOLATE}73${POP_ISOLATE}`);
  });

  it('Given a word-hunt round, When the mystery word was found or missed, Then it says so without the word', () => {
    expect(buildQuickShareText({ ...base, words: words('cat'), targetWordFound: true })).toContain(
      'quickPlay.solo.recap.targetFound',
    );
    expect(buildQuickShareText({ ...base, words: words('cat'), targetWordFound: false })).toContain(
      'quickPlay.solo.recap.targetMissed',
    );
  });

  it('Given a non-hunt round, When built, Then no mystery-word line appears', () => {
    const text = buildQuickShareText({ ...base, mode: 'classic', words: words('cat'), targetWordFound: false });
    expect(text).not.toContain('quickPlay.solo.recap.target');
  });

  it('Given a streak above one day, When built, Then the streak line appears; one day or none, it does not', () => {
    expect(buildQuickShareText({ ...base, words: [], dayStreak: 5 })).toContain(
      `quickPlay.solo.recap.streak(days=${LTR_ISOLATE}5${POP_ISOLATE})`,
    );
    expect(buildQuickShareText({ ...base, words: [], dayStreak: 1 })).not.toContain('recap.streak');
  });

  it('Given translations that carry emoji, When built, Then the text is emoji-free and ends with the call to play', () => {
    const emojiT = (key: string) => `${key} 🔥`;
    const text = buildQuickShareText({ ...base, words: words('cat', 'remarkable'), dayStreak: 3, t: emojiT });
    expect(text).not.toMatch(EMOJI);
    expect(text.trimEnd().split('\n').at(-1)).toBe('quickPlay.solo.recap.cta');
  });

  it('Given a Hebrew locale string, When built, Then RTL copy is kept and the numbers stay LTR-isolated', () => {
    const he = (key: string, params?: Record<string, string>) =>
      key === 'quickPlay.solo.recap.score' ? `${params?.score} נקודות, ${params?.pct}% מהיעד` : key;
    const line = buildQuickShareText({ ...base, words: [], t: he }).split('\n')[1];
    expect(line).toBe(`${LTR_ISOLATE}420${POP_ISOLATE} נקודות, ${LTR_ISOLATE}73${POP_ISOLATE}% מהיעד`);
  });
});
