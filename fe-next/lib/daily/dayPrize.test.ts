import { describe, it, expect } from 'vitest';
import { DAY_PRIZE_TABLE, EDU_FIXED_PRIZE_COINS, JACKPOT_ODDS, LUCKY_ODDS, dayPrizeOddsPct, eduDayPrize, isDayPrizeResponse, maxPrizeCoins, rollDayPrize } from './dayPrize';

describe('rollDayPrize', () => {
  it('is stable for the same player, date and kind', () => {
    const a = rollDayPrize('player-1', '2026-11-07', 'clear');
    const b = rollDayPrize('player-1', '2026-11-07', 'clear');
    expect(b).toEqual(a);
  });

  it('only pays amounts from the table', () => {
    for (let i = 0; i < 500; i++) {
      for (const kind of ['clear', 'perfect'] as const) {
        const prize = rollDayPrize(`p${i}`, '2026-11-07', kind);
        const table = DAY_PRIZE_TABLE[kind];
        const allowed = [...table.common, table.lucky, table.jackpot];
        expect(allowed).toContain(prize.coins);
        expect(prize.xp).toBe(table.xp);
        expect(prize.kind).toBe(kind);
      }
    }
  });

  it('varies across days for one player', () => {
    const coins = new Set<number>();
    for (let d = 1; d <= 28; d++) {
      coins.add(rollDayPrize('player-1', `2026-11-${String(d).padStart(2, '0')}`, 'clear').coins);
    }
    expect(coins.size).toBeGreaterThan(2);
  });

  it('hits the rare tiers at roughly the stated odds', () => {
    const n = 20000;
    let jackpot = 0;
    let lucky = 0;
    for (let i = 0; i < n; i++) {
      const prize = rollDayPrize(`player-${i}`, '2026-11-07', 'clear');
      if (prize.tier === 'jackpot') jackpot++;
      if (prize.tier === 'lucky') lucky++;
    }
    expect(jackpot / n).toBeGreaterThan(JACKPOT_ODDS * 0.7);
    expect(jackpot / n).toBeLessThan(JACKPOT_ODDS * 1.3);
    expect(lucky / n).toBeGreaterThan(LUCKY_ODDS * 0.8);
    expect(lucky / n).toBeLessThan(LUCKY_ODDS * 1.2);
  });

  it('rolls clear and perfect independently', () => {
    let differ = 0;
    for (let i = 0; i < 200; i++) {
      const c = rollDayPrize(`p${i}`, '2026-11-07', 'clear');
      const p = rollDayPrize(`p${i}`, '2026-11-07', 'perfect');
      if (c.tier !== p.tier) differ++;
    }
    expect(differ).toBeGreaterThan(20);
  });
});

describe('maxPrizeCoins', () => {
  it('is the jackpot', () => {
    expect(maxPrizeCoins('clear')).toBe(DAY_PRIZE_TABLE.clear.jackpot);
  });
});

describe('isDayPrizeResponse', () => {
  it('accepts a claim body and rejects junk', () => {
    expect(isDayPrizeResponse({ kind: 'clear', tier: 'lucky', coins: 50, xp: 50, claimed: true })).toBe(true);
    expect(isDayPrizeResponse({ claimed: true, coins: 50, xp: 100 })).toBe(false);
    expect(isDayPrizeResponse(null)).toBe(false);
  });
});

describe('eduDayPrize (education side: fixed amount, no roll)', () => {
  it('Given a clear, Then pays a fixed 25 coins with the usual XP', () => {
    expect(eduDayPrize('clear')).toEqual({ kind: 'clear', tier: 'common', coins: 25, xp: DAY_PRIZE_TABLE.clear.xp, fixed: true });
  });

  it('Given a perfect day, Then pays a fixed 50 coins with the usual XP', () => {
    expect(eduDayPrize('perfect')).toEqual({ kind: 'perfect', tier: 'common', coins: 50, xp: DAY_PRIZE_TABLE.perfect.xp, fixed: true });
    expect(EDU_FIXED_PRIZE_COINS).toEqual({ clear: 25, perfect: 50 });
  });

  it('Given the random box, Then it is marked not fixed', () => {
    expect(rollDayPrize('p', '2026-11-07', 'clear').fixed).toBe(false);
  });
});

describe('dayPrizeOddsPct', () => {
  it('states the real odds as whole percents that add up to 100', () => {
    expect(dayPrizeOddsPct()).toEqual({ common: 75, lucky: 19, jackpot: 6 });
  });
});

describe('isDayPrizeResponse with the fixed flag', () => {
  it('accepts a body with or without `fixed` (older cached boxes)', () => {
    expect(isDayPrizeResponse({ kind: 'clear', tier: 'common', coins: 25, xp: 50, claimed: true, fixed: true })).toBe(true);
    expect(isDayPrizeResponse({ kind: 'clear', tier: 'common', coins: 25, xp: 50, claimed: true, fixed: 'yes' })).toBe(false);
  });
});
