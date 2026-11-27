import { describe, it, expect } from 'vitest';
import { MAX_PLAYERS, newMatch, passPlay, podium, PLAYER_COLORS } from '../passPlay';

const names = (n: number) => Array.from({ length: n }, (_, i) => `P${i + 1}`);

describe('Pass & Play', () => {
  it('Given one player, then the match is a single turn with no hand-off screen', () => {
    let m = newMatch(names(1));
    expect(m.phase).toBe('playing');
    m = passPlay(m, { type: 'turnEnd', score: 420 });
    expect(m.phase).toBe('done');
    expect(podium(m)[0]).toMatchObject({ name: 'P1', score: 420, place: 1 });
  });

  it('Given three players, then each gets a turn with a hand-off screen in between, then the podium', () => {
    let m = newMatch(names(3));
    expect(m.phase).toBe('handoff');
    expect(m.turn).toBe(0);
    m = passPlay(m, { type: 'ready' });
    expect(m.phase).toBe('playing');
    m = passPlay(m, { type: 'turnEnd', score: 100 });
    expect(m).toMatchObject({ phase: 'handoff', turn: 1 });
    m = passPlay(passPlay(m, { type: 'ready' }), { type: 'turnEnd', score: 300 });
    m = passPlay(passPlay(m, { type: 'ready' }), { type: 'turnEnd', score: 300 });
    expect(m.phase).toBe('podium');
    expect(podium(m).map((p) => [p.name, p.place])).toEqual([['P2', 1], ['P3', 1], ['P1', 3]]);
    expect(passPlay(m, { type: 'finish' }).phase).toBe('done');
  });

  it('Given more than four names or blank names, then it keeps four players with default names and distinct colours', () => {
    const m = newMatch(['', ' Dana ', 'x', 'y', 'z']);
    expect(m.players).toHaveLength(MAX_PLAYERS);
    expect(m.players[0].name).toBe('');
    expect(m.players[1].name).toBe('Dana');
    expect(new Set(m.players.map((p) => p.color)).size).toBe(MAX_PLAYERS);
    expect(PLAYER_COLORS.length).toBeGreaterThanOrEqual(MAX_PLAYERS);
  });

  it('Given a turn end arrives twice or while handing off, then nothing changes', () => {
    const m = passPlay(newMatch(names(2)), { type: 'turnEnd', score: 50 });
    expect(m.phase).toBe('handoff');
    expect(m.players[0].score).toBeNull();
  });
});
