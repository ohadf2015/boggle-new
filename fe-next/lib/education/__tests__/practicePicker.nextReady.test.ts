/**
 * "What do I play next?" — the other half of a reward moment.
 *
 * Every practice mode ends on its own results card with a retry button, so
 * "practise again" already exists. What did not exist was the second half:
 * finishing a round dropped the student back on a grid of thirteen tiles to
 * re-choose from. This picks the next playable tile so the page can offer it
 * as one tap.
 */
import { describe, it, expect } from 'vitest';
import { nextReadyTile, type PracticeTile } from '../practicePicker';

const tile = (id: string, ready: boolean): PracticeTile => ({
  id,
  mode: 'flashcard',
  titleKey: `t.${id}`,
  skillKey: `s.${id}`,
  ready,
  count: 3,
  countKind: 'words',
  sessions: 0,
});

describe('nextReadyTile', () => {
  it('returns the next ready tile after the current one', () => {
    const tiles = [tile('a', true), tile('b', true), tile('c', true)];
    expect(nextReadyTile(tiles, 'a')?.id).toBe('b');
  });

  it('skips locked tiles rather than offering a dead end', () => {
    const tiles = [tile('a', true), tile('b', false), tile('c', true)];
    expect(nextReadyTile(tiles, 'a')?.id).toBe('c');
  });

  it('wraps around so the last tile still offers a next', () => {
    const tiles = [tile('a', true), tile('b', true)];
    expect(nextReadyTile(tiles, 'b')?.id).toBe('a');
  });

  it('returns null when this is the only playable tile', () => {
    const tiles = [tile('a', true), tile('b', false)];
    expect(nextReadyTile(tiles, 'a')).toBeNull();
  });

  it('returns null when nothing is playable', () => {
    expect(nextReadyTile([tile('a', false)], 'a')).toBeNull();
  });

  it('falls back to the first ready tile when the current id is unknown', () => {
    const tiles = [tile('a', false), tile('b', true)];
    expect(nextReadyTile(tiles, 'gone')?.id).toBe('b');
  });
});
