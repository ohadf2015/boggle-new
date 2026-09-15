import { describe, it, expect } from 'vitest';
import {
  createClassicUnpluggedGame,
  revealWord,
  submitAnswer,
  setTeamCount,
  isPerfectRun,
  winningTeamIndex,
  currentWord,
  isClassMode,
  resetClassicUnpluggedGame,
  scoreForSubmit,
} from '../classicUnpluggedGame';
import { UNPLUGGED_BASE_POINTS, UNPLUGGED_STREAK_STEP } from '../unpluggedReteachGame';

const WORDS = ['neutron', 'quark', 'photon'] as const;

describe('classicUnpluggedGame', () => {
  it('defaults to whole-class mode (1 group)', () => {
    const g = createClassicUnpluggedGame(WORDS);
    expect(g.teamCount).toBe(1);
    expect(isClassMode(g)).toBe(true);
    expect(g.teamScores).toEqual([0]);
    expect(g.phase).toBe('prompt');
    expect(currentWord(g)).toBe('neutron');
  });

  it('finishes immediately when there are no words', () => {
    const g = createClassicUnpluggedGame([]);
    expect(g.phase).toBe('finished');
  });

  it('lets the teacher pick class or 2–4 teams only before the first submit', () => {
    let g = createClassicUnpluggedGame(WORDS);
    g = setTeamCount(g, 3);
    expect(g.teamCount).toBe(3);
    expect(g.teamScores).toEqual([0, 0, 0]);
    g = revealWord(g);
    g = submitAnswer(g, true);
    expect(setTeamCount(g, 2).teamCount).toBe(3);
  });

  it('ignores reveal when not in prompt phase', () => {
    let g = createClassicUnpluggedGame(WORDS);
    g = revealWord(g);
    expect(g.phase).toBe('revealed');
    expect(revealWord(g).phase).toBe('revealed');
  });

  it('awards the class and advances on submit got-it', () => {
    let g = createClassicUnpluggedGame(WORDS);
    g = revealWord(g);
    g = submitAnswer(g, true);
    expect(g.cleared).toBe(1);
    expect(g.teamScores[0]).toBe(UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP);
    expect(g.index).toBe(1);
    expect(g.phase).toBe('prompt');
    expect(currentWord(g)).toBe('quark');
  });

  it('breaks the streak and scores zero on not-yet', () => {
    let g = createClassicUnpluggedGame(WORDS);
    g = submitAnswer(revealWord(g), true);
    expect(g.streak).toBe(1);
    g = submitAnswer(revealWord(g), false);
    expect(g.streak).toBe(0);
    expect(g.missed).toBe(1);
    expect(g.teamScores[0]).toBe(UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP);
  });

  it('rotates teams after each submit when teamCount > 1', () => {
    let g = createClassicUnpluggedGame(WORDS, { teamCount: 2 });
    g = submitAnswer(revealWord(g), true);
    expect(g.activeTeam).toBe(1);
    expect(g.teamScores[0]).toBeGreaterThan(0);
    expect(g.teamScores[1]).toBe(0);
    g = submitAnswer(revealWord(g), true);
    expect(g.activeTeam).toBe(0);
    expect(g.teamScores[1]).toBeGreaterThan(0);
  });

  it('finishes after the last word and reports a perfect run', () => {
    let g = createClassicUnpluggedGame(['a', 'b']);
    g = submitAnswer(revealWord(g), true);
    g = submitAnswer(revealWord(g), true);
    expect(g.phase).toBe('finished');
    expect(isPerfectRun(g)).toBe(true);
    expect(winningTeamIndex(g)).toBe(0);
  });

  it('scoreForSubmit grows with streak then caps', () => {
    expect(scoreForSubmit({ streak: 1 })).toBe(UNPLUGGED_BASE_POINTS + UNPLUGGED_STREAK_STEP);
    expect(scoreForSubmit({ streak: 99 })).toBe(
      UNPLUGGED_BASE_POINTS + 5 * UNPLUGGED_STREAK_STEP,
    );
  });

  it('reset keeps team count and restarts at prompt', () => {
    let g = createClassicUnpluggedGame(WORDS, { teamCount: 4 });
    g = submitAnswer(revealWord(g), true);
    g = resetClassicUnpluggedGame(g);
    expect(g.teamCount).toBe(4);
    expect(g.phase).toBe('prompt');
    expect(g.judged).toBe(0);
    expect(g.index).toBe(0);
  });
});
