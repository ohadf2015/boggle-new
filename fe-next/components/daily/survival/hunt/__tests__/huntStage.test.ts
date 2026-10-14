import { describe, it, expect } from 'vitest';
import {
  huntStageReducer,
  initialHuntStage,
  verdictFor,
  praiseKeyFor,
  verdictHoldMs,
  matchesTargetLength,
} from '../huntStage';

const path = [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }];

describe('verdictFor', () => {
  it('maps accepted words to good', () => {
    expect(verdictFor('valid-word')).toBe('good');
    expect(verdictFor('target-found')).toBe('good');
  });
  it('maps penalised words to bad', () => {
    expect(verdictFor('not-on-board')).toBe('bad');
    expect(verdictFor('not-in-dictionary')).toBe('bad');
    expect(verdictFor('invalid-word')).toBe('bad');
  });
  it('maps soft rejections to dupe', () => {
    expect(verdictFor('duplicate')).toBe('dupe');
    expect(verdictFor('too-short')).toBe('dupe');
    expect(verdictFor('too-long')).toBe('dupe');
  });
  it('ignores no feedback', () => {
    expect(verdictFor(null)).toBeNull();
  });
});

describe('praiseKeyFor', () => {
  it('scales with word length', () => {
    expect(praiseKeyFor(3)).toBe('wordHunt.survival.stage.praiseShort');
    expect(praiseKeyFor(5)).toBe('wordHunt.survival.stage.praiseMid');
    expect(praiseKeyFor(7)).toBe('wordHunt.survival.stage.praiseLong');
  });
});

describe('huntStageReducer', () => {
  it('shows the live word while dragging', () => {
    const s = huntStageReducer(initialHuntStage, { type: 'live', word: 'CAT' });
    expect(s).toMatchObject({ phase: 'live', word: 'CAT', verdict: null });
  });

  it('holds the word and path as pending on release, ignoring the empty word that follows', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'live', word: 'CAT' });
    s = huntStageReducer(s, { type: 'release', word: 'CAT', path, seq: 4 });
    s = huntStageReducer(s, { type: 'live', word: '' });
    expect(s).toMatchObject({ phase: 'pending', word: 'CAT', path, releaseSeq: 4 });
  });

  it('keeps the held word when the board re-reports the same word right after release', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'live', word: 'CA' });
    s = huntStageReducer(s, { type: 'release', word: 'CAT', path, seq: 2 });
    s = huntStageReducer(s, { type: 'live', word: 'CAT' });
    expect(s).toMatchObject({ phase: 'pending', word: 'CAT', path, releaseSeq: 2 });
    s = huntStageReducer(s, { type: 'feedback', seq: 3, verdict: 'good' });
    s = huntStageReducer(s, { type: 'live', word: 'CAT' });
    expect(s).toMatchObject({ phase: 'verdict', verdict: 'good', word: 'CAT' });
  });

  it('turns into a verdict only for feedback newer than the release', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'release', word: 'CAT', path, seq: 4 });
    s = huntStageReducer(s, { type: 'feedback', seq: 4, verdict: 'good' });
    expect(s.phase).toBe('pending');
    s = huntStageReducer(s, { type: 'feedback', seq: 5, verdict: 'good' });
    expect(s).toMatchObject({ phase: 'verdict', verdict: 'good', word: 'CAT', path });
  });

  it('a new drag replaces a held verdict at once', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'release', word: 'CAT', path, seq: 0 });
    s = huntStageReducer(s, { type: 'feedback', seq: 1, verdict: 'bad' });
    s = huntStageReducer(s, { type: 'live', word: 'D' });
    expect(s).toMatchObject({ phase: 'live', word: 'D', verdict: null, path: [] });
  });

  it('a cancelled drag with no release goes back to idle', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'live', word: 'CA' });
    s = huntStageReducer(s, { type: 'live', word: '' });
    expect(s.phase).toBe('idle');
  });

  it('expires back to idle', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'release', word: 'CAT', path, seq: 0 });
    s = huntStageReducer(s, { type: 'expire' });
    expect(s).toEqual(initialHuntStage);
  });

  it('feedback with no pending release leaves the stage alone', () => {
    const s = huntStageReducer(initialHuntStage, { type: 'feedback', seq: 9, verdict: 'good' });
    expect(s).toBe(initialHuntStage);
  });

  it('given two words in flight, when the first word\'s verdict lands while the second is held, then the second keeps waiting for its own', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'release', word: 'XQZ', path, seq: 0 });
    s = huntStageReducer(s, { type: 'release', word: 'DOG', path, seq: 0 });
    s = huntStageReducer(s, { type: 'feedback', seq: 1, verdict: 'bad', word: 'XQZ' });
    expect(s).toMatchObject({ phase: 'pending', word: 'DOG', verdict: null });
    s = huntStageReducer(s, { type: 'feedback', seq: 2, verdict: 'good', word: 'DOG' });
    expect(s).toMatchObject({ phase: 'verdict', word: 'DOG', verdict: 'good' });
  });

  it('given feedback naming the held word in another case, then it still lands', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'release', word: 'cat', path, seq: 0 });
    s = huntStageReducer(s, { type: 'feedback', seq: 1, verdict: 'good', word: 'CAT' });
    expect(s).toMatchObject({ phase: 'verdict', verdict: 'good' });
  });

  it('given feedback that names no word, then it falls back to the sequence order', () => {
    let s = huntStageReducer(initialHuntStage, { type: 'release', word: 'CAT', path, seq: 0 });
    s = huntStageReducer(s, { type: 'feedback', seq: 1, verdict: 'dupe', word: null });
    expect(s).toMatchObject({ phase: 'verdict', verdict: 'dupe' });
  });
});

describe('verdictHoldMs', () => {
  it('given a rejection, then it stays up long enough to read the reason', () => {
    expect(verdictHoldMs('bad')).toBeGreaterThanOrEqual(1500);
    expect(verdictHoldMs('dupe')).toBeGreaterThanOrEqual(1500);
  });

  it('given an accepted word, then it clears quicker than a rejection so the next swipe starts clean', () => {
    expect(verdictHoldMs('good')).toBeLessThan(verdictHoldMs('bad'));
    expect(verdictHoldMs('good')).toBeGreaterThanOrEqual(700);
  });
});

describe('matchesTargetLength', () => {
  it('given a live word as long as the hidden word, then submitting it would use a try', () => {
    expect(matchesTargetLength('HOUSE', 'HOUSE'.length)).toBe(true);
    expect(matchesTargetLength('mouse', 5)).toBe(true);
  });

  it('given a shorter or longer word, or no word, then it is a free discovery', () => {
    expect(matchesTargetLength('HOU', 5)).toBe(false);
    expect(matchesTargetLength('HOUSES', 5)).toBe(false);
    expect(matchesTargetLength('', 0)).toBe(false);
  });

  it('given a Hebrew word, then it counts letters not UTF-16 units', () => {
    expect(matchesTargetLength('שלום', 4)).toBe(true);
  });
});

