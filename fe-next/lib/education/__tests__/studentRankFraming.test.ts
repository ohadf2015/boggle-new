import { describe, it, expect } from 'vitest';
import { selectStudentRankFraming } from '../studentRankFraming';

/**
 * A classroom student must never be shown their absolute position in the whole
 * class while the round is live.
 *
 * Research constraint (research.md §1): bottom-ranked students disengage under
 * an *absolute* leaderboard, and the mechanism is competence frustration driven
 * by the position itself — not by the content. "#24 / 28" on a phone for four
 * minutes is exactly that stimulus. Relative/local rank (position against a
 * nearby peer) is the documented alternative that keeps the competitive pull
 * without the harm.
 *
 * So this selector is defined by what it CANNOT produce: no rank, no total, no
 * percentile. It returns my own score and one neighbour.
 */
describe('selectStudentRankFraming', () => {
  const board = [
    { username: 'Maya', score: 50 },
    { username: 'Me', score: 38 },
    { username: 'Sam', score: 20 },
    { username: 'Ana', score: 4 },
  ];

  it('never exposes an absolute rank, total or percentile', () => {
    const framing = selectStudentRankFraming(board, 'Me');

    expect(framing).not.toBeNull();
    // Structural guard: the whole point of the module is the absent fields.
    const keys = Object.keys(framing!);
    expect(keys.sort()).toEqual(['myScore', 'rival']);
    expect(JSON.stringify(framing)).not.toMatch(/rank|total|percentile|position/i);
  });

  it('reports my own score — the non-comparative half of the framing', () => {
    expect(selectStudentRankFraming(board, 'Me')!.myScore).toBe(38);
  });

  it('names the single nearest player ahead of me, with the gap to close', () => {
    const { rival } = selectStudentRankFraming(board, 'Me')!;
    // |Δ| to Maya is 12, to Sam is 18 → Maya is the local neighbour.
    expect(rival).toEqual({ name: 'Maya', gap: 12, direction: 'ahead' });
  });

  it('names my nearest chaser when I am the one out front', () => {
    const { rival } = selectStudentRankFraming(
      [
        { username: 'Me', score: 50 },
        { username: 'Maya', score: 44 },
        { username: 'Sam', score: 3 },
      ],
      'Me',
    )!;
    expect(rival).toEqual({ name: 'Maya', gap: 6, direction: 'behind' });
  });

  it('calls an equal score a tie rather than ordering us', () => {
    const { rival } = selectStudentRankFraming(
      [
        { username: 'Maya', score: 30 },
        { username: 'Me', score: 30 },
      ],
      'Me',
    )!;
    expect(rival).toEqual({ name: 'Maya', gap: 0, direction: 'tie' });
  });

  it('still reports my score when I am alone on the board, with no rival', () => {
    const framing = selectStudentRankFraming([{ username: 'Me', score: 12 }], 'Me');
    expect(framing).toEqual({ myScore: 12, rival: null });
  });

  it('returns null when I am not on the board at all', () => {
    expect(selectStudentRankFraming(board, 'Ghost')).toBeNull();
  });

  it('tolerates an empty board rather than throwing mid-round', () => {
    expect(selectStudentRankFraming([], 'Me')).toBeNull();
  });
});
