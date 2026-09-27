import { describe, it, expect } from 'vitest';
import { practiceShortlist, SHORTLIST_SIZE } from '../practiceShortlist';
import type { PracticeTile } from '../practicePicker';

function tile(id: string, over: Partial<PracticeTile> = {}): PracticeTile {
  return {
    id,
    mode: 'solo_board',
    titleKey: `t.${id}`,
    skillKey: `s.${id}`,
    ready: true,
    count: 8,
    countKind: 'words',
    sessions: 0,
    ...over,
  } as PracticeTile;
}

describe('practiceShortlist', () => {
  it('GIVEN a full tile list WHEN shortlisted THEN exactly one tile is recommended', () => {
    const result = practiceShortlist([
      tile('word_list', { mode: 'word_list' }),
      tile('spelling', { mode: 'spelling' }),
      tile('blitz', { mode: 'blitz' }),
    ]);

    expect(result.recommended).not.toBeNull();
    expect(result.recommended?.id).not.toBe('word_list');
  });

  it('GIVEN a ready tile the student never played WHEN shortlisted THEN it outranks a played one', () => {
    const result = practiceShortlist([
      tile('blitz', { mode: 'blitz', sessions: 9 }),
      tile('spelling', { mode: 'spelling', sessions: 0 }),
    ]);

    expect(result.recommended?.id).toBe('spelling');
  });

  it('GIVEN every game played equally WHEN shortlisted THEN the fixed priority order decides', () => {
    const result = practiceShortlist([
      tile('flashcard', { mode: 'flashcard', sessions: 3 }),
      tile('blitz', { mode: 'blitz', sessions: 3 }),
      tile('spelling', { mode: 'spelling', sessions: 3 }),
    ]);

    expect(result.recommended?.id).toBe('blitz');
  });

  it('GIVEN many ready tiles WHEN shortlisted THEN at most three sit beside the recommendation', () => {
    const tiles = ['blitz', 'spelling', 'matching', 'flashcard', 'solo_board', 'warmup'].map((id) =>
      tile(id, { mode: id === 'solo_board' || id === 'warmup' ? 'solo_board' : (id as never) })
    );
    const result = practiceShortlist(tiles);

    expect(result.alsoReady).toHaveLength(SHORTLIST_SIZE);
    expect(result.alsoReady.map((entry) => entry.id)).not.toContain(result.recommended?.id);
  });

  it('GIVEN a shortlist WHEN counted THEN every tile appears exactly once across the three buckets', () => {
    const tiles = [
      tile('blitz', { mode: 'blitz' }),
      tile('spelling', { mode: 'spelling' }),
      tile('matching', { mode: 'matching' }),
      tile('flashcard', { mode: 'flashcard' }),
      tile('word_list', { mode: 'word_list' }),
      tile('locked_one', { ready: false }),
      tile('locked_two', { ready: false }),
    ];
    const result = practiceShortlist(tiles);

    const seen = [
      ...(result.recommended ? [result.recommended.id] : []),
      ...result.alsoReady.map((entry) => entry.id),
      ...result.rest.map((entry) => entry.id),
    ];
    expect(new Set(seen).size).toBe(tiles.length);
    expect(seen).toHaveLength(tiles.length);
  });

  it('GIVEN locked tiles only WHEN shortlisted THEN nothing is recommended and all are rest', () => {
    const result = practiceShortlist([
      tile('a', { ready: false }),
      tile('b', { ready: false }),
    ]);

    expect(result.recommended).toBeNull();
    expect(result.alsoReady).toHaveLength(0);
    expect(result.rest).toHaveLength(2);
  });

  it('GIVEN only the read-only word list is ready WHEN shortlisted THEN it is still offered as the recommendation', () => {
    const result = practiceShortlist([
      tile('word_list', { mode: 'word_list' }),
      tile('spelling', { mode: 'spelling', ready: false }),
    ]);

    expect(result.recommended?.id).toBe('word_list');
  });
});

describe('practiceShortlist — tiles whose plays are not counted', () => {
  /**
   * `buildPracticeTiles` hardcodes `sessions: 0` on Word Tower and every
   * targeted-vocabulary tile, because `student_practice_progress` has no column
   * for them. Ranking "never played first" off that number therefore makes them
   * permanently new: once a student has played each counted game once, Word
   * Tower becomes the recommendation and stays there for good.
   */
  it('GIVEN every counted game played WHEN shortlisted THEN an uncounted tile does not win by default', () => {
    const result = practiceShortlist([
      tile('blitz', { mode: 'blitz', sessions: 2 }),
      tile('spelling', { mode: 'spelling', sessions: 2 }),
      tile('word_tower', { variant: 'word_tower', sessions: 0 }),
      tile('vocab_focus:synonym', { mode: 'vocab_focus', sessions: 0 }),
    ]);

    expect(result.recommended?.id).toBe('blitz');
  });

  it('GIVEN a genuinely unplayed counted game WHEN shortlisted THEN it still wins', () => {
    const result = practiceShortlist([
      tile('blitz', { mode: 'blitz', sessions: 2 }),
      tile('spelling', { mode: 'spelling', sessions: 0 }),
      tile('word_tower', { variant: 'word_tower', sessions: 0 }),
    ]);

    expect(result.recommended?.id).toBe('spelling');
  });
});
