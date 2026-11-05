import { describe, it, expect } from 'vitest';
import { buildLessonCrossword, lessonClueOf, MIN_LESSON_CROSSWORD_WORDS } from '../lessonCrossword';
import type { CrosswordPuzzle } from '../types';

const EN = [
  { word: 'planet', clue: 'A world that circles a star' },
  { word: 'orbit', clue: 'The path around a star' },
  { word: 'comet', clue: 'An icy visitor with a tail' },
  { word: 'star', clue: 'Our sun is one' },
  { word: 'moon', clue: 'It circles the Earth' },
  { word: 'galaxy', clue: 'A huge group of stars' },
];

function letterAt(p: CrosswordPuzzle, row: number, col: number): string | null {
  const cell = p.cells[row * p.size + col];
  return cell && !cell.block ? cell.solution : null;
}

function readSlot(p: CrosswordPuzzle, slotId: string): string {
  const slot = p.slots.find((s) => s.id === slotId)!;
  return slot.cells.map((c) => letterAt(p, c.row, c.col)).join('');
}

describe('buildLessonCrossword', () => {
  it('builds a grid from the lesson words only, each clued with its own lesson clue', () => {
    const result = buildLessonCrossword({ entries: EN, locale: 'en', seed: 7, id: 'lesson-1' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const { puzzle, lessonWordBySlot } = result;
    expect(puzzle.id).toBe('lesson-1');
    expect(puzzle.slots.length).toBeGreaterThanOrEqual(MIN_LESSON_CROSSWORD_WORDS);
    expect(Object.keys(lessonWordBySlot).sort()).toEqual(puzzle.slots.map((s) => s.id).sort());
    for (const slot of puzzle.slots) {
      const word = lessonWordBySlot[slot.id]!;
      const entry = EN.find((e) => e.word === word)!;
      expect(slot.answer).toBe(word);
      expect(readSlot(puzzle, slot.id)).toBe(word);
      expect(slot.clue).toBe(entry.clue);
    }
  });

  it('never invents a slot: every run in the grid is a placed lesson word', () => {
    for (let seed = 0; seed < 25; seed++) {
      const result = buildLessonCrossword({ entries: EN, locale: 'en', seed, id: `s${seed}` });
      if (!result.ok) continue;
      expect(result.puzzle.slots.every((s) => EN.some((e) => e.word === s.answer))).toBe(true);
      expect(new Set(result.puzzle.slots.map((s) => s.answer)).size).toBe(result.puzzle.slots.length);
    }
  });

  it('is deterministic per seed and keeps the grid phone-sized', () => {
    const a = buildLessonCrossword({ entries: EN, locale: 'en', seed: 3, id: 'x' });
    const b = buildLessonCrossword({ entries: EN, locale: 'en', seed: 3, id: 'x' });
    expect(a).toEqual(b);
    if (a.ok) expect(a.puzzle.size).toBeLessThanOrEqual(13);
  });

  it('refuses a lesson with too few words instead of dealing a broken grid', () => {
    const result = buildLessonCrossword({ entries: EN.slice(0, 2), locale: 'en', seed: 1, id: 'x' });
    expect(result).toEqual({ ok: false, reason: 'tooFewWords', usableWords: 2 });
  });

  it('refuses words that cannot cross each other', () => {
    const result = buildLessonCrossword({
      entries: [{ word: 'abc', clue: 'x' }, { word: 'def', clue: 'y' }, { word: 'ghi', clue: 'z' }],
      locale: 'en', seed: 1, id: 'x',
    });
    expect(result.ok).toBe(false);
  });

  it('counts a duplicate lesson word once', () => {
    const dupes = [...EN, { word: 'Planet', clue: 'again' }, { word: 'planet ', clue: 'and again' }];
    const result = buildLessonCrossword({ entries: dupes, locale: 'en', seed: 7, id: 'x' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const placed = Object.values(result.lessonWordBySlot).map((w) => w.toLowerCase().trim());
    expect(placed.filter((w) => w === 'planet').length).toBeLessThanOrEqual(1);
  });

  it('skips multi-word phrases and words with no clue', () => {
    const entries = [...EN, { word: 'black hole', clue: 'Nothing escapes it' }, { word: 'nebula', clue: '' }];
    const result = buildLessonCrossword({ entries, locale: 'en', seed: 7, id: 'x' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.values(result.lessonWordBySlot)).not.toContain('black hole');
    expect(Object.values(result.lessonWordBySlot)).not.toContain('nebula');
  });

  it('builds a Hebrew grid right-to-left, folding final letters and dropping niqqud', () => {
    const he = [
      { word: 'שָׁלוֹם', clue: 'ברכה' },
      { word: 'מלך', clue: 'שליט' },
      { word: 'לחם', clue: 'מאפה' },
      { word: 'ספר', clue: 'קוראים בו' },
      { word: 'כלב', clue: 'נובח' },
    ];
    const result = buildLessonCrossword({ entries: he, locale: 'he', seed: 2, id: 'x' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.puzzle.rtl).toBe(true);
    const peace = Object.entries(result.lessonWordBySlot).find(([, w]) => w === 'שָׁלוֹם');
    if (peace) expect(result.puzzle.slots.find((s) => s.id === peace[0])!.answer).toBe('שלומ');
  });

  it('builds a Russian grid and a kana-only Japanese grid, skipping kanji words', () => {
    const ru = [
      { word: 'кот', clue: 'мяукает' }, { word: 'окно', clue: 'в стене' },
      { word: 'точка', clue: 'знак' }, { word: 'ёлка', clue: 'дерево' },
    ];
    const ruResult = buildLessonCrossword({ entries: ru, locale: 'ru', seed: 4, id: 'x' });
    expect(ruResult.ok).toBe(true);

    const ja = [
      { word: 'さくら', clue: '春の花' }, { word: 'くるま', clue: '道を走る' },
      { word: 'まくら', clue: '寝るとき' }, { word: 'らくだ', clue: '砂漠の動物' },
      { word: '学校', clue: '勉強する所' },
    ];
    const jaResult = buildLessonCrossword({ entries: ja, locale: 'ja', seed: 4, id: 'x' });
    expect(jaResult.ok).toBe(true);
    if (jaResult.ok) expect(Object.values(jaResult.lessonWordBySlot)).not.toContain('学校');
  });
});

describe('lessonClueOf', () => {
  it('prefers the definition, then the example with the word blanked, then synonyms', () => {
    expect(lessonClueOf({ word: 'orbit', definition: 'A path', example: 'x' })).toBe('A path');
    expect(lessonClueOf({ word: 'orbit', example: 'The Moon will Orbit the Earth.' })).toBe('The Moon will ____ the Earth.');
    expect(lessonClueOf({ word: 'big', synonyms: ['large', 'huge'] })).toBe('large, huge');
    expect(lessonClueOf({ word: 'orbit', example: 'Nothing about it.' })).toBe('');
    expect(lessonClueOf({ word: 'orbit' })).toBe('');
  });
});
