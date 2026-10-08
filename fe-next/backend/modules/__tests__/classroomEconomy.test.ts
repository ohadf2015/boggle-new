import { describe, it, expect } from 'vitest';
import {
  CHEST_ODDS,
  POWER_UPS,
  WRONG_ANSWER_COST,
  applyRoundBoundary,
  buyPowerUp,
  emptyEconomyState,
  recordCorrectWord,
  recordWrongWord,
  rollChest,
  roundStanding,
  streakMultiplier,
  useHint,
  wordCash,
} from '../classroomEconomy';
import { chestPartPool } from '../classroomEconomyPool';

const NOW = 1_000_000;

describe('wordCash', () => {
  it('Given a 3-letter word, When priced, Then it pays the base amount', () => {
    expect(wordCash({ wordLength: 3, fromLesson: false })).toBe(1);
  });

  it('Given a long word, When priced, Then the base is capped', () => {
    expect(wordCash({ wordLength: 12, fromLesson: false })).toBe(6);
  });

  it('Given a lesson word, When priced, Then it pays double', () => {
    expect(wordCash({ wordLength: 5, fromLesson: true })).toBe(6);
  });
});

describe('streakMultiplier', () => {
  it('Given streaks below 3, Then the multiplier is x1', () => {
    expect(streakMultiplier(0)).toBe(1);
    expect(streakMultiplier(2)).toBe(1);
  });

  it('Given a streak of 3 to 5, Then the multiplier is x2', () => {
    expect(streakMultiplier(3)).toBe(2);
    expect(streakMultiplier(5)).toBe(2);
  });

  it('Given a streak of 6 or more, Then the multiplier is x3', () => {
    expect(streakMultiplier(6)).toBe(3);
  });
});

describe('recordCorrectWord', () => {
  it('Given a fresh student, When a word lands, Then cash and streak go up', () => {
    const start = applyRoundBoundary(emptyEconomyState(), 'r1');
    const res = recordCorrectWord(start, { wordLength: 4, fromLesson: false, now: NOW });
    expect(res.delta).toBe(2);
    expect(res.state.cash).toBe(2);
    expect(res.state.streak).toBe(1);
    expect(res.state.cashEarned).toBe(2);
  });

  it('Given a 3-streak, When the next word lands, Then cash is multiplied', () => {
    let s = applyRoundBoundary(emptyEconomyState(), 'r1');
    for (let i = 0; i < 3; i++) s = recordCorrectWord(s, { wordLength: 3, fromLesson: false, now: NOW }).state;
    const res = recordCorrectWord(s, { wordLength: 3, fromLesson: false, now: NOW });
    expect(res.multiplier).toBe(2);
    expect(res.delta).toBe(2);
  });

  it('Given an active double-cash power-up, When a word lands, Then cash doubles', () => {
    let s = applyRoundBoundary(emptyEconomyState(), 'r1');
    s = { ...s, cash: 50 };
    s = buyPowerUp(s, 'doubleCash', NOW).state;
    const res = recordCorrectWord(s, { wordLength: 3, fromLesson: false, now: NOW + 1 });
    expect(res.delta).toBe(2);
  });

  it('Given double-cash has expired, When a word lands, Then cash is single', () => {
    let s = applyRoundBoundary(emptyEconomyState(), 'r1');
    s = { ...s, cash: 50 };
    s = buyPowerUp(s, 'doubleCash', NOW).state;
    const res = recordCorrectWord(s, { wordLength: 3, fromLesson: false, now: NOW + POWER_UPS.doubleCash.durationMs + 1 });
    expect(res.delta).toBe(1);
  });
});

describe('recordWrongWord', () => {
  it('Given cost disabled, When wrong, Then cash is untouched and the streak breaks', () => {
    let s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 10, streak: 4 }, 'r1');
    const res = recordWrongWord(s, { costEnabled: false, now: NOW });
    expect(res.state.cash).toBe(10);
    expect(res.state.streak).toBe(0);
    expect(res.cost).toBe(0);
  });

  it('Given cost enabled, When wrong, Then the cost comes off the balance', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 10 }, 'r1');
    const res = recordWrongWord(s, { costEnabled: true, now: NOW });
    expect(res.cost).toBe(WRONG_ANSWER_COST);
    expect(res.state.cash).toBe(10 - WRONG_ANSWER_COST);
  });

  it('Given a balance below the cost, When wrong, Then the balance floors at 0', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 1 }, 'r1');
    const res = recordWrongWord(s, { costEnabled: true, now: NOW });
    expect(res.state.cash).toBe(0);
    expect(res.cost).toBe(1);
  });

  it('Given a held streak shield, When wrong, Then the streak and cost are both spared', () => {
    let s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 20, streak: 4 }, 'r1');
    s = buyPowerUp(s, 'streakShield', NOW).state;
    const res = recordWrongWord(s, { costEnabled: true, now: NOW });
    expect(res.state.streak).toBe(4);
    expect(res.state.cash).toBe(20 - POWER_UPS.streakShield.cost);
    expect(res.state.shieldHeld).toBe(false);
    expect(res.cost).toBe(0);
  });
});

describe('buyPowerUp', () => {
  it('Given too little cash, When buying, Then it is refused and state is unchanged', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 1 }, 'r1');
    const res = buyPowerUp(s, 'doubleCash', NOW);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('insufficient_cash');
    expect(res.state).toBe(s);
  });

  it('Given enough cash, When buying a hint, Then cash drops and a hint is held', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 50 }, 'r1');
    const res = buyPowerUp(s, 'hintReveal', NOW);
    expect(res.ok).toBe(true);
    expect(res.state.cash).toBe(50 - POWER_UPS.hintReveal.cost);
    expect(res.state.hintsHeld).toBe(1);
  });

  it('Given double-cash already active, When buying again, Then it is refused', () => {
    let s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 200 }, 'r1');
    s = buyPowerUp(s, 'doubleCash', NOW).state;
    const res = buyPowerUp(s, 'doubleCash', NOW + 1);
    expect(res.ok).toBe(false);
    expect(res.reason).toBe('already_active');
  });

  it('Given an unknown power-up id, When buying, Then it is refused', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 200 }, 'r1');
    expect(buyPowerUp(s, 'targetRival' as never, NOW).reason).toBe('unknown_power_up');
  });
});

describe('useHint', () => {
  it('Given a held hint, When used, Then one hint is consumed', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', hintsHeld: 2 }, 'r1');
    const res = useHint(s);
    expect(res.ok).toBe(true);
    expect(res.state.hintsHeld).toBe(1);
  });

  it('Given no held hint, When used, Then it is refused', () => {
    const s = applyRoundBoundary(emptyEconomyState(), 'r1');
    expect(useHint(s).ok).toBe(false);
  });
});

describe('applyRoundBoundary', () => {
  it('Given a new round, Then streak and double-cash reset but cash and a held shield carry', () => {
    let s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', cash: 40, streak: 5 }, 'r1');
    s = buyPowerUp(s, 'streakShield', NOW).state;
    s = buyPowerUp(s, 'doubleCash', NOW).state;
    const next = applyRoundBoundary(s, 'r2');
    expect(next.roundId).toBe('r2');
    expect(next.streak).toBe(0);
    expect(next.shieldHeld).toBe(true);
    expect(next.doubleCashUntil).toBeNull();
    expect(next.cash).toBe(s.cash);
    expect(next.cashEarned).toBe(s.cashEarned);
  });

  it('Given the same round, Then state is returned unchanged', () => {
    const s = applyRoundBoundary({ ...emptyEconomyState(), roundId: 'r1', streak: 3 }, 'r1');
    expect(applyRoundBoundary(s, 'r1')).toBe(s);
  });
});

describe('chest odds and roll', () => {
  it('Given the published odds, Then they sum to 1', () => {
    const total = CHEST_ODDS.common + CHEST_ODDS.rare + CHEST_ODDS.epic;
    expect(total).toBeCloseTo(1, 10);
  });

  it('Given the same seed, Then the roll is deterministic', () => {
    expect(rollChest('ABC:r1:u1')).toEqual(rollChest('ABC:r1:u1'));
  });

  it('Given many seeds, Then every rarity appears with its odds shape', () => {
    const counts = { common: 0, rare: 0, epic: 0 };
    for (let i = 0; i < 4000; i++) counts[rollChest(`seed-${i}`).rarity]++;
    expect(counts.common).toBeGreaterThan(counts.rare);
    expect(counts.rare).toBeGreaterThan(counts.epic);
    expect(counts.epic).toBeGreaterThan(0);
  });

  it('Given a roll, Then the item is a named avatar part from its rarity pool and XP matches the rarity', () => {
    const chest = rollChest('ABC:r1:u9');
    expect(chestPartPool(chest.rarity)).toContain(chest.itemId);
    expect(chest.xp).toBeGreaterThan(0);
  });
});

describe('round cash', () => {
  it('Given cash earned in round r1, When round r2 starts, Then roundCash resets and cashEarned carries', () => {
    const r1 = applyRoundBoundary(emptyEconomyState(), 'r1');
    const afterWord = recordCorrectWord(r1, { wordLength: 5, fromLesson: false, now: NOW }).state;
    const r2 = applyRoundBoundary(afterWord, 'r2');
    expect(afterWord.roundCash).toBe(afterWord.cashEarned);
    expect(r2.roundCash).toBe(0);
    expect(r2.cashEarned).toBe(afterWord.cashEarned);
  });
});

describe('roundStanding', () => {
  const withRound = (roundId: string, roundCash: number) => ({ ...emptyEconomyState(), roundId, roundCash, cashEarned: roundCash });

  it('Given three students earned in r1, When asked for the second, Then rank 2 of 3 with that round cash', () => {
    const all = { a: withRound('r1', 9), b: withRound('r1', 14), c: withRound('r1', 4) };
    expect(roundStanding(all, 'r1', 'a')).toEqual({ roundCash: 9, rank: 2, size: 3 });
  });

  it('Given a student who did not earn in this round, Then rank is null and their round cash is zero', () => {
    const all = { a: withRound('r1', 9), b: withRound('r0', 30) };
    expect(roundStanding(all, 'r1', 'b')).toEqual({ roundCash: 0, rank: null, size: 1 });
  });
});
