import { describe, it, expect } from 'vitest';
import { flightFor, newSnow, snowAnswer, snowTick, SNOW_SECONDS } from '../snowball';

const balls = [
  { text: 'SNOW', real: true },
  { text: 'SNWO', real: false },
  { text: 'TREE', real: true },
  { text: 'GIFT', real: true },
];

describe('Snowball Fight', () => {
  it('Given a real word caught, then it scores, combo grows and the catch is recorded', () => {
    const s = snowAnswer(newSnow(), 'catch', balls);
    expect(s.score).toBeGreaterThan(0);
    expect(s.combo).toBe(1);
    expect(s.plays).toEqual([{ w: 'SNOW', i: 0 }]);
    expect(s.i).toBe(1);
  });

  it('Given a fake tossed, then it scores and keeps the combo; a fake caught breaks it and frosts the screen', () => {
    let s = snowAnswer(newSnow(), 'catch', balls);
    const tossed = snowAnswer(s, 'toss', balls);
    expect(tossed.combo).toBe(2);
    expect(tossed.plays).toHaveLength(1);
    s = snowAnswer(s, 'catch', balls);
    expect(s.combo).toBe(0);
    expect(s.frost).toBeGreaterThan(0);
    expect(s.last).toBe('wrong');
  });

  it('Given a ball reaches the player unanswered, then it counts as a mistake', () => {
    const s = snowTick(newSnow(), flightFor(0) + 0.01, balls.length);
    expect(s.i).toBe(1);
    expect(s.last).toBe('hit');
    expect(s.combo).toBe(0);
  });

  it('Given a long combo, then the multiplier caps at 3x', () => {
    let s = { ...newSnow(), combo: 80 };
    const before = s.score;
    s = snowAnswer(s, 'catch', balls);
    expect(s.score - before).toBeLessThanOrEqual(35 * 3);
  });

  it('Given the clock or the balls run out, then the fight ends', () => {
    expect(snowTick({ ...newSnow(), elapsed: SNOW_SECONDS - 0.01 }, 0.02, balls.length).over).toBe(true);
    let s = newSnow();
    for (let k = 0; k < balls.length; k++) s = snowAnswer(s, balls[k].real ? 'catch' : 'toss', balls);
    expect(s.over).toBe(true);
  });
});
