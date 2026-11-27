import { describe, it, expect } from 'vitest';
import { clashSpin, landingLetter, launch, letterGelt, newSpinGame, stepSpin, PLACE_POINTS, SPIN_ROUNDS } from '../spin';

const run = (g: ReturnType<typeof newSpinGame>, sec: number, until?: () => boolean) => {
  for (let i = 0; i < sec * 60 && !(until && until()); i++) stepSpin(g, 1 / 60);
};

describe('Dreidel Spin-Off', () => {
  it('Given an Israeli player, then dreidels land on pe and never shin; everyone else gets shin', () => {
    let r = 0;
    const rng = () => ((r += 0.13) % 1);
    const il = Array.from({ length: 40 }, () => landingLetter(rng, 'IL'));
    const world = Array.from({ length: 40 }, () => landingLetter(rng, 'world'));
    expect(il).toContain('pe');
    expect(il).not.toContain('shin');
    expect(world).toContain('shin');
    expect(world).not.toContain('pe');
  });

  it('Given each landing letter, then gimel pays the most gelt and nun pays nothing', () => {
    expect(letterGelt('gimel')).toBeGreaterThan(letterGelt('hei'));
    expect(letterGelt('hei')).toBeGreaterThan(letterGelt('shin'));
    expect(letterGelt('nun')).toBe(0);
    expect(letterGelt('pe')).toBe(letterGelt('shin'));
  });

  it('Given two dreidels clash, then the slower spinner loses more spin', () => {
    const [a, b] = clashSpin(30, 10, 8);
    expect(10 - b).toBeGreaterThan(30 - a);
    expect(a).toBeGreaterThan(0);
  });

  it('Given a flick, then every dreidel spins until all land, one wins, and the player scores place plus gelt', () => {
    const g = newSpinGame(11, 'world');
    expect(g.phase).toBe('aim');
    launch(g, 0, -700);
    expect(g.phase).toBe('spinning');
    launch(g, 0, -700);
    run(g, 25, () => g.phase === 'landed');
    expect(g.phase).toBe('landed');
    expect(g.tops.filter((t) => t.place === 1)).toHaveLength(1);
    expect(g.tops.every((t) => t.letter !== null)).toBe(true);
    const you = g.tops.find((t) => t.you)!;
    expect(g.score).toBe(PLACE_POINTS[you.place! - 1] + letterGelt(you.letter!));
    for (const t of g.tops) expect(Math.hypot(t.body.position.x - 384, t.body.position.y - 680)).toBeLessThan(260);
  });

  it('Given all rounds are played, then the turn is over', () => {
    const g = newSpinGame(5, 'IL');
    for (let round = 0; round < SPIN_ROUNDS; round++) {
      run(g, 3, () => g.phase === 'aim');
      launch(g, 120, -600);
      run(g, 30, () => g.phase === 'landed' || g.phase === 'over');
    }
    run(g, 3, () => g.phase === 'over');
    expect(g.phase).toBe('over');
    expect(g.tops.every((t) => t.letter !== 'shin')).toBe(true);
  });
});
