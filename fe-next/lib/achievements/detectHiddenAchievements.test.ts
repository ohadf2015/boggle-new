/**
 * Test: pure hidden-achievement detection (selection-gesture + word-pattern).
 * No storage, no DOM — total functions, garbage in → [].
 */

import {
  detectSelectionAchievements,
  detectWordAchievements,
} from './detectHiddenAchievements';

describe('detectSelectionAchievements — board_sweep', () => {
  it('fires when one drag selects EVERY tile', () => {
    expect(detectSelectionAchievements({ selectedTileCount: 16, totalTiles: 16 }))
      .toContain('board_sweep');
  });

  it('does not fire when one tile short', () => {
    expect(detectSelectionAchievements({ selectedTileCount: 15, totalTiles: 16 }))
      .not.toContain('board_sweep');
  });

  it('does not fire on an empty board (guards divide-by-nothing)', () => {
    expect(detectSelectionAchievements({ selectedTileCount: 0, totalTiles: 0 }))
      .toEqual([]);
  });
});

describe('detectWordAchievements — palindrome', () => {
  it('fires for a valid palindrome of length >= 4', () => {
    expect(detectWordAchievements({ word: 'noon', validWordTimesSec: [5] }))
      .toContain('palindrome');
  });

  it('is case-insensitive', () => {
    expect(detectWordAchievements({ word: 'LeveL', validWordTimesSec: [5] }))
      .toContain('palindrome');
  });

  it('does not fire for a length-3 palindrome (boundary)', () => {
    expect(detectWordAchievements({ word: 'wow', validWordTimesSec: [5] }))
      .not.toContain('palindrome');
  });

  it('does not fire for a non-palindrome', () => {
    expect(detectWordAchievements({ word: 'word', validWordTimesSec: [5] }))
      .not.toContain('palindrome');
  });
});

describe('detectWordAchievements — speed_demon', () => {
  it('fires at 5 valid words all within the first 10s', () => {
    expect(detectWordAchievements({ word: 'cat', validWordTimesSec: [1, 2, 3, 4, 5] }))
      .toContain('speed_demon');
  });

  it('does not fire at 4 words (boundary)', () => {
    expect(detectWordAchievements({ word: 'cat', validWordTimesSec: [1, 2, 3, 4] }))
      .not.toContain('speed_demon');
  });

  it('does not fire when the 5th word lands after 10s', () => {
    expect(detectWordAchievements({ word: 'cat', validWordTimesSec: [1, 2, 3, 4, 10.5] }))
      .not.toContain('speed_demon');
  });
});

describe('detectWordAchievements — triple_threat', () => {
  it('fires when the same letter appears 3+ times', () => {
    expect(detectWordAchievements({ word: 'banana', validWordTimesSec: [5] }))
      .toContain('triple_threat');
  });

  it('does not fire with only two of a letter (boundary)', () => {
    expect(detectWordAchievements({ word: 'apple', validWordTimesSec: [5] }))
      .not.toContain('triple_threat');
  });
});

describe('detection is total / safe', () => {
  it('empty word yields no word achievements', () => {
    expect(detectWordAchievements({ word: '', validWordTimesSec: [] })).toEqual([]);
  });
});
