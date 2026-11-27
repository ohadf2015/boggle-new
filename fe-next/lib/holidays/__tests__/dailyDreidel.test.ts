import { describe, expect, it } from 'vitest';
import {
  CRACKER_COINS,
  CRACKER_JOKES,
  DREIDEL_MIN_POT,
  SHIN_BONUS,
  crackerJoke,
  dreidelCoins,
  dreidelFaces,
  rollDreidel,
} from '../dailyDreidel';

describe('dreidelFaces', () => {
  it('Given an Israeli player, Then the fourth face is פ (a great miracle happened here)', () => {
    expect(dreidelFaces('IL')).toEqual(['נ', 'ג', 'ה', 'פ']);
  });

  it('Given anyone else, Then the fourth face is ש (happened there)', () => {
    expect(dreidelFaces('world')).toEqual(['נ', 'ג', 'ה', 'ש']);
  });
});

describe('dreidelCoins', () => {
  it('Given each face, Then the payout follows the real rules against today’s gelt', () => {
    expect(dreidelCoins('nun', 30)).toBe(0);
    expect(dreidelCoins('gimel', 30)).toBe(30);
    expect(dreidelCoins('hei', 30)).toBe(15);
    expect(dreidelCoins('shin', 30)).toBe(SHIN_BONUS);
  });

  it('Given no gelt today, Then gimel and hei still spin against a small pot', () => {
    expect(dreidelCoins('gimel', 0)).toBe(DREIDEL_MIN_POT);
    expect(dreidelCoins('hei', 0)).toBe(Math.ceil(DREIDEL_MIN_POT / 2));
  });
});

describe('rollDreidel', () => {
  it('Given a random source, Then each quarter maps to one face', () => {
    expect(rollDreidel(() => 0)).toBe('nun');
    expect(rollDreidel(() => 0.3)).toBe('gimel');
    expect(rollDreidel(() => 0.6)).toBe('hei');
    expect(rollDreidel(() => 0.99)).toBe('shin');
  });
});

describe('crackerJoke', () => {
  it('Given any random source, Then the joke index is within the translated set', () => {
    expect(crackerJoke(() => 0)).toBe(1);
    expect(crackerJoke(() => 0.999)).toBe(CRACKER_JOKES);
    expect(CRACKER_COINS).toBeGreaterThan(0);
  });
});
