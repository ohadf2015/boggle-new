import { describe, it, expect } from 'vitest';
import { clashSpin, landingLetter, launch, letterGelt, newSpinGame, nudge, stepSpin, PLACE_POINTS, SPIN_ROUNDS, TOP_R, KO_POINTS } from '../spin';
import { FAMILY_RULES } from '../family';

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
    expect(g.score).toBe(PLACE_POINTS[you.place! - 1] + letterGelt(you.letter!) + g.kos * KO_POINTS + g.geltGrabbed * 25);
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

  const playRound = (g: ReturnType<typeof newSpinGame>) => {
    run(g, 3, () => g.phase === 'aim');
    launch(g, 60, -650);
    run(g, 30, () => g.phase === 'landed' || g.phase === 'over');
  };

  it('Given the rounds go on, then a fourth dreidel joins in round 2 and a mega dreidel shows up in round 3', () => {
    expect(SPIN_ROUNDS).toBe(6);
    const g = newSpinGame(7, 'world');
    expect(g.tops).toHaveLength(3);
    playRound(g);
    run(g, 3, () => g.phase === 'aim');
    expect(g.tops).toHaveLength(4);
    expect(g.tops.some((t) => t.mega)).toBe(false);
    playRound(g);
    run(g, 3, () => g.phase === 'aim');
    expect(g.tops.filter((t) => t.mega)).toHaveLength(1);
    expect(g.tops.find((t) => t.mega)!.r).toBeGreaterThan(TOP_R);
  });

  it('Given any seed, then gelt rains into the arena in exactly one round, round 2 or 3', () => {
    for (let seed = 1; seed <= 12; seed++) {
      const g = newSpinGame(seed, 'world');
      const rains: number[] = [];
      for (let r = 0; r < SPIN_ROUNDS; r++) {
        run(g, 3, () => g.phase === 'aim');
        launch(g, 0, -650);
        if (g.events.some((e) => e.type === 'rain')) rains.push(g.round);
        g.events.length = 0;
        run(g, 30, () => g.phase === 'landed' || g.phase === 'over');
      }
      expect(rains).toHaveLength(1);
      expect([1, 2]).toContain(rains[0]);
    }
  });

  it('Given a tap while dreidels spin, then your dreidel gets a push toward it, three times a round at most', () => {
    const g = newSpinGame(3, 'world');
    launch(g, 0, -400);
    const you = g.tops.find((t) => t.you)!;
    const spin = you.spin;
    expect(nudge(g, you.body.position.x + 200, you.body.position.y)).toBe(true);
    expect(you.body.velocity.x).toBeGreaterThan(0);
    expect(you.spin).toBe(spin);
    expect(nudge(g, 0, 0)).toBe(true);
    expect(nudge(g, 0, 0)).toBe(true);
    expect(nudge(g, 0, 0)).toBe(false);
  });

  it('Given a full match, then the score stays inside the server bound', () => {
    for (const seed of [1, 2, 3, 4]) {
      const g = newSpinGame(seed, 'world');
      for (let r = 0; r < SPIN_ROUNDS; r++) {
        run(g, 3, () => g.phase === 'aim');
        launch(g, 0, -900);
        for (let i = 0; i < 30 * 60 && g.phase === 'spinning'; i++) {
          const foe = g.tops.find((t) => !t.you && !t.letter);
          if (foe && i % 40 === 0) nudge(g, foe.body.position.x, foe.body.position.y);
          stepSpin(g, 1 / 60);
        }
        run(g, 3, () => g.phase === 'aim' || g.phase === 'over');
      }
      expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.spin.cap);
      expect(g.score).toBeLessThanOrEqual(FAMILY_RULES.spin.perSecond * 35);
    }
  });

  it('Given a strong aimed flick versus a lazy tap, then the flick wins rounds more often', () => {
    const places = (power: number) => {
      let sum = 0;
      for (let seed = 1; seed <= 24; seed++) {
        const g = newSpinGame(seed, 'world');
        launch(g, 0, -power);
        run(g, 30, () => g.phase === 'landed');
        sum += g.tops.find((t) => t.you)!.place!;
      }
      return sum / 24;
    };
    expect(places(950)).toBeLessThan(places(300) - 0.4);
  });

  it('Given a whole match, then an aiming player beats a button masher on average', () => {
    const play = (aim: boolean, seed: number) => {
      const g = newSpinGame(seed, 'world');
      let r = seed * 9301;
      const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
      for (let round = 0; round < SPIN_ROUNDS; round++) {
        run(g, 3, () => g.phase === 'aim' || g.phase === 'over');
        if (g.phase === 'over') break;
        launch(g, aim ? 0 : (rnd() - 0.5) * 200, aim ? -950 : -300);
        for (let i = 0; i < 30 * 60 && g.phase === 'spinning'; i++) {
          if (i % 25 === 0) {
            const foe = g.tops.filter((t) => !t.you && !t.letter).sort((a, b) => b.spin - a.spin)[0];
            if (aim && foe) nudge(g, foe.body.position.x, foe.body.position.y);
            else if (!aim) nudge(g, 100 + rnd() * 568, 450 + rnd() * 460);
          }
          stepSpin(g, 1 / 60);
        }
      }
      return g.score;
    };
    let aimed = 0;
    let mashed = 0;
    for (let seed = 1; seed <= 30; seed++) {
      aimed += play(true, seed);
      mashed += play(false, seed);
    }
    expect(aimed / 30).toBeGreaterThan((mashed / 30) * 1.3);
  });
});
