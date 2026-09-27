import { describe, it, expect } from 'vitest';
import {
  createTeamTilesGame,
  flipTile,
  judgeTile,
  setTeamCount,
  isPerfectRun,
  winningTeamIndex,
  remainingDown,
  activeTile,
  scoreForTeamFlip,
  resetTeamTilesGame,
} from '../teamTilesUnpluggedGame';
import { UNPLUGGED_BASE_POINTS, UNPLUGGED_STREAK_STEP } from '../unpluggedReteachGame';

const WORDS = ['neutron', 'quark', 'photon'] as const;

describe('teamTilesUnpluggedGame', () => {
  it('defaults to 2 teams when only a seed is passed', () => {
    const g = createTeamTilesGame(WORDS, { seed: 1045 });
    expect(g.teamCount).toBe(2);
    expect(g.teamScores).toEqual([0, 0]);
  });

  it('builds a face-down board from missed words with a seeded shuffle', () => {
    const a = createTeamTilesGame(WORDS, { seed: 42, teamCount: 2 });
    const b = createTeamTilesGame(WORDS, { seed: 42, teamCount: 2 });
    expect(a.tiles.map((t) => t.word)).toEqual(b.tiles.map((t) => t.word));
    expect(a.tiles.every((t) => t.face === 'down')).toBe(true);
    expect(a.phase).toBe('board');
    expect(a.teamScores).toEqual([0, 0]);
    expect(remainingDown(a)).toBe(3);
  });

  it('finishes immediately when there are no words', () => {
    const g = createTeamTilesGame([]);
    expect(g.phase).toBe('finished');
  });

  it('lets the teacher pick 2–4 teams only before the first flip', () => {
    let g = createTeamTilesGame(WORDS, { seed: 1, teamCount: 2 });
    g = setTeamCount(g, 4);
    expect(g.teamCount).toBe(4);
    expect(g.teamScores).toEqual([0, 0, 0, 0]);
    g = flipTile(g, g.tiles[0]!.id);
    expect(setTeamCount(g, 2).teamCount).toBe(4);
  });

  it('flips one tile at a time and ignores a second flip while revealed', () => {
    let g = createTeamTilesGame(WORDS, { seed: 7 });
    const first = g.tiles[0]!;
    g = flipTile(g, first.id);
    expect(g.phase).toBe('revealed');
    expect(activeTile(g)?.word).toBe(first.word);
    expect(g.tiles.find((t) => t.id === first.id)?.face).toBe('up');
    const other = g.tiles.find((t) => t.face === 'down')!;
    expect(flipTile(g, other.id).activeTileId).toBe(first.id);
  });

  it('awards the active team and rotates on "got it"', () => {
    let g = createTeamTilesGame(WORDS, { seed: 3, teamCount: 2 });
    const id = g.tiles[0]!.id;
    g = flipTile(g, id);
    g = judgeTile(g, true);
    expect(g.cleared).toBe(1);
    expect(g.teamScores[0]).toBe(UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP);
    expect(g.activeTeam).toBe(1);
    expect(g.phase).toBe('board');
    expect(g.tiles.find((t) => t.id === id)?.face).toBe('cleared');
  });

  it('breaks the streak and scores zero on "not yet"', () => {
    let g = createTeamTilesGame(WORDS, { seed: 9, teamCount: 2 });
    g = judgeTile(flipTile(g, g.tiles[0]!.id), true);
    expect(g.streak).toBe(1);
    g = judgeTile(flipTile(g, g.tiles.find((t) => t.face === 'down')!.id), false);
    expect(g.streak).toBe(0);
    expect(g.missed).toBe(1);
    expect(g.teamScores[1]).toBe(0);
  });

  it('finishes when every tile is judged and reports a perfect run', () => {
    let g = createTeamTilesGame(['a', 'b'], { seed: 11, teamCount: 2 });
    for (const face of ['down', 'down'] as const) {
      void face;
      const next = g.tiles.find((t) => t.face === 'down')!;
      g = judgeTile(flipTile(g, next.id), true);
    }
    expect(g.phase).toBe('finished');
    expect(isPerfectRun(g)).toBe(true);
    expect(winningTeamIndex(g)).not.toBeNull();
  });

  it('scores streak steps like Unplugged (capped)', () => {
    expect(scoreForTeamFlip({ streak: 1 })).toBe(UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP);
    expect(scoreForTeamFlip({ streak: 99 })).toBe(UNPLUGGED_BASE_POINTS + 5 * UNPLUGGED_STREAK_STEP);
  });

  it('resets the board with the same team count', () => {
    let g = createTeamTilesGame(WORDS, { seed: 2, teamCount: 3 });
    g = judgeTile(flipTile(g, g.tiles[0]!.id), true);
    const again = resetTeamTilesGame(g);
    expect(again.teamCount).toBe(3);
    expect(again.cleared).toBe(0);
    expect(again.phase).toBe('board');
    expect(again.tiles.every((t) => t.face === 'down')).toBe(true);
  });
});
