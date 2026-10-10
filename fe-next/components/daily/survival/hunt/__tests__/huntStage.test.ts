import { describe, it, expect } from 'vitest';
import { huntStageReducer, initialHuntStage, verdictFor, praiseKeyFor } from '../huntStage';

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
});
