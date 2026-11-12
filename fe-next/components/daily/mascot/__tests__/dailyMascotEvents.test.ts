import { describe, it, expect } from 'vitest';
import { huntFeedbackEvent, nextHuntStreak, wheelVerdictEvent } from '../dailyMascotEvents';

describe('wheelVerdictEvent', () => {
  it('turns an accepted word into a word-submitted with the word for rare-letter gags', () => {
    expect(wheelVerdictEvent('accepted', 'QUIZ')).toEqual({ kind: 'word-submitted', wordLength: 4, gemLetterUsed: false, word: 'QUIZ' });
  });

  it('maps a repeat to duplicate-word and a bad or rule-breaking word to word-rejected', () => {
    expect(wheelVerdictEvent('found', 'CAT')).toEqual({ kind: 'duplicate-word' });
    expect(wheelVerdictEvent('invalid', 'XQZ')).toEqual({ kind: 'word-rejected' });
    expect(wheelVerdictEvent('rule', 'AB')).toEqual({ kind: 'word-rejected' });
  });

  it('stays quiet when the dictionary could not answer', () => {
    expect(wheelVerdictEvent('unknown', 'CAT')).toBeNull();
  });
});

describe('huntFeedbackEvent', () => {
  it.each(['valid-word', 'short-valid', 'discovery', 'target-found'] as const)('%s is a found word', (type) => {
    expect(huntFeedbackEvent(type, 'TRAIN')).toEqual({ kind: 'word-submitted', wordLength: 5, gemLetterUsed: false, word: 'TRAIN' });
  });

  it.each(['invalid-word', 'not-on-board', 'not-in-dictionary', 'too-short', 'too-long'] as const)('%s is a rejection', (type) => {
    expect(huntFeedbackEvent(type, 'ZZZ')).toEqual({ kind: 'word-rejected' });
  });

  it('a repeat guess is a duplicate', () => {
    expect(huntFeedbackEvent('duplicate', 'TRAIN')).toEqual({ kind: 'duplicate-word' });
  });

  it('clues, outages and missing words say nothing', () => {
    expect(huntFeedbackEvent('clue-unlocked', 'TRAIN')).toBeNull();
    expect(huntFeedbackEvent('unavailable', 'TRAIN')).toBeNull();
    expect(huntFeedbackEvent('target-attempt', 'TRAIN')).toBeNull();
    expect(huntFeedbackEvent('valid-word', null)).toBeNull();
    expect(huntFeedbackEvent(null, 'TRAIN')).toBeNull();
  });
});

describe('nextHuntStreak', () => {
  it('counts found words in a row and drops to zero on a rejection', () => {
    let s = 0;
    s = nextHuntStreak(s, 'valid-word');
    s = nextHuntStreak(s, 'discovery');
    s = nextHuntStreak(s, 'valid-word');
    expect(s).toBe(3);
    expect(nextHuntStreak(s, 'duplicate')).toBe(3);
    expect(nextHuntStreak(s, 'not-on-board')).toBe(0);
  });
});
