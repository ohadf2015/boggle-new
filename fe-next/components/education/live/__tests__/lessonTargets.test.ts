import { describe, it, expect } from 'vitest';
import { buildLessonTargets, maskLessonWord, buildRaceSlots, targetsToSlots } from '../lessonTargets';

const GRID = [
  ['S', 'T', 'O', 'R', 'M'],
  ['H', 'A', 'D', 'E', 'W'],
  ['I', 'N', 'L', 'S', 'A'],
  ['V', 'E', 'R', 'T', 'Y'],
  ['O', 'C', 'K', 'B', 'U'],
];

const base = {
  words: ['storm', 'shad', 'planet'],
  foundWords: [] as Array<{ word: string; isValid: boolean | null }>,
  grid: GRID,
  language: 'en',
  gameMode: 'classic',
  gameModeConfirmed: true,
};

describe('buildLessonTargets', () => {
  it('lists only the lesson words a path on the visible board can spell', () => {
    const targets = buildLessonTargets(base);
    expect(targets?.map((x) => x.word)).toEqual(['storm', 'shad']);
  });

  it('marks a word found once the server validated it, in any case', () => {
    const targets = buildLessonTargets({ ...base, foundWords: [{ word: 'STORM', isValid: true }] });
    expect(targets).toEqual([
      { word: 'storm', found: true },
      { word: 'shad', found: false },
    ]);
  });

  it('does not reveal a word that is still pending or was rejected', () => {
    const targets = buildLessonTargets({
      ...base,
      foundWords: [{ word: 'storm', isValid: null }, { word: 'shad', isValid: false }],
    });
    expect(targets?.every((x) => !x.found)).toBe(true);
  });

  it.each(['word-hunt', 'blast', 'wheel-rush', 'wordcraft', 'vocab-quiz'])(
    'hides in %s, whose screen is not the board the lesson words were placed on',
    (gameMode) => {
      expect(buildLessonTargets({ ...base, gameMode })).toBeNull();
    },
  );

  it('hides until the server confirms the mode, so a random rematch never flashes it', () => {
    expect(buildLessonTargets({ ...base, gameModeConfirmed: false })).toBeNull();
  });

  it('hides with no board yet and when no lesson word made it onto the board', () => {
    expect(buildLessonTargets({ ...base, grid: null })).toBeNull();
    expect(buildLessonTargets({ ...base, words: ['planet'] })).toBeNull();
    expect(buildLessonTargets({ ...base, words: [] })).toBeNull();
  });

  it('matches a Hebrew word placed with its final letter against the regular-letter submission', () => {
    const heGrid = [
      ['ש', 'ל', 'ו', 'א'],
      ['ב', 'מ', 'ה', 'ר'],
      ['ק', 'ד', 'י', 'ת'],
      ['ג', 'נ', 'ע', 'פ'],
    ];
    const targets = buildLessonTargets({
      ...base,
      language: 'he',
      grid: heGrid,
      words: ['שלום'],
      foundWords: [{ word: 'שלומ', isValid: true }],
    });
    expect(targets).toEqual([{ word: 'שלום', found: true }]);
  });
});

describe('maskLessonWord', () => {
  it('keeps the first letter and counts the rest', () => {
    expect(maskLessonWord('storm')).toEqual({ first: 'S', rest: 4 });
    expect(maskLessonWord('שלום')).toEqual({ first: 'ש', rest: 3 });
  });
});

describe('buildRaceSlots', () => {
  const view = {
    roundId: 4,
    total: 3,
    claimedCount: 2,
    slots: [
      { index: 0, first: 'S', length: 5, claim: { word: 'storm', username: 'Noa', avatar: { emoji: '🦊' }, teamId: null } },
      { index: 1, first: 'S', length: 4, claim: { word: 'shad', username: 'Dana', avatar: null, teamId: 1 } },
      { index: 2, first: 'ש', length: 4, claim: null },
    ],
  };

  it('Given a race list, When built for me, Then each slot is hidden, mine or taken by a classmate', () => {
    const slots = buildRaceSlots(view, 'noa');
    expect(slots.map((s) => s.state)).toEqual(['mine', 'taken', 'hidden']);
    expect(slots[1]).toMatchObject({ word: 'shad', by: 'Dana' });
    expect(slots[2]).toMatchObject({ first: 'ש', rest: 3 });
    expect(slots[2].word).toBeUndefined();
  });

  it('Given a support student with the word bank, When a hidden slot matches exactly one bank word, Then it shows that word as a hint', () => {
    const slots = buildRaceSlots(view, 'eli', ['storm', 'shad', 'שלום']);
    expect(slots[2].hint).toBe('שלום');
  });

  it('Given two bank words share first letter and length, When built, Then no hint guesses between them', () => {
    const slots = buildRaceSlots({ ...view, slots: [{ index: 0, first: 'C', length: 4, claim: null }] }, 'eli', ['cell', 'cost']);
    expect(slots[0].hint).toBeUndefined();
  });

  it('Given a target list from the private strip, When converted, Then found words read as mine', () => {
    expect(targetsToSlots([{ word: 'storm', found: true }, { word: 'shad', found: false }]).map((s) => s.state)).toEqual(['mine', 'hidden']);
  });
});
