import { describe, expect, it } from 'vitest';
import {
  type Estate,
  type RunSummary,
  NEUTRAL_PERKS,
  applyRun,
  braceCost,
  clampRunSummary,
  emptyEstate,
  MAX_GUEST_CLAIM_COINS,
  MAX_GUEST_CLAIM_RUNS,
  mergeGuestEstate,
  nextBracePrice,
  perksFromEstate,
  runCoins,
  upgradeCost,
} from '../estate';
import { PLOT_SLOTS } from '../estateCatalog';

const RUN: RunSummary = { floors: 12, perfects: 4, bestCombo: 3, crates: 2, heightM: 36 };

const withPlots = (levels: number[], extra: Partial<Estate> = {}): Estate => ({
  ...emptyEstate(),
  plots: PLOT_SLOTS.map((slot, i) => ({ slot, level: levels[i] ?? 0, damaged: false })),
  ...extra,
});

describe('mergeGuestEstate — progress made signed-out survives signing in', () => {
  it('given a guest who never played, when merged, then the account is untouched', () => {
    const account = withPlots([2], { coins: 90, runs: 4 });
    expect(mergeGuestEstate(account, emptyEstate())).toBe(account);
  });

  it('given a brand-new account, when merged, then the guest bank AND what their upgrades cost arrive as coins', () => {
    const guest = withPlots([2], { coins: 120, runs: 5, bestM: 40 });
    const merged = mergeGuestEstate(emptyEstate(), guest);
    expect(merged.coins).toBe(120 + upgradeCost(1, 'foundation', 0) + upgradeCost(1, 'foundation', 1));
    expect(merged.runs).toBe(5);
    expect(merged.bestM).toBe(40);
  });

  it('given a forged guest bank with a huge run count, when merged, then the coins it adds are capped outright', () => {
    // runs is client state (localStorage): a per-run cap alone let a forged
    // `runs: 1e9` mint app-wide coins, which daily retries and reveals spend.
    const merged = mergeGuestEstate(emptyEstate(), { ...emptyEstate(), coins: 1e9, runs: 1e9 });
    expect(merged.coins).toBe(MAX_GUEST_CLAIM_COINS);
    expect(merged.runs).toBeLessThanOrEqual(MAX_GUEST_CLAIM_RUNS);
  });

  it('given a forged maxed guest empire in district 10, when merged into a fresh account, then no district or plot is adopted', () => {
    const merged = mergeGuestEstate(emptyEstate(), withPlots([5, 5, 5, 5, 5], { runs: 1, district: 10 }));
    expect(merged.district).toBe(1);
    expect(merged.plots.every((p) => p.level === 0)).toBe(true);
    expect(merged.coins).toBeLessThanOrEqual(1000);
  });

  it('given an account that already has progress, when merged, then guest coins AND the value of guest upgrades are credited, plots kept', () => {
    const account = withPlots([1], { coins: 50, runs: 3, bestM: 20 });
    const guest = withPlots([2], { coins: 30, runs: 2, bestM: 25 });
    const refund = upgradeCost(1, 'foundation', 0) + upgradeCost(1, 'foundation', 1);
    const merged = mergeGuestEstate(account, guest);
    expect(merged.plots).toEqual(account.plots);
    expect(merged.coins).toBe(50 + 30 + refund);
    expect(merged.runs).toBe(5);
    expect(merged.bestM).toBe(25);
  });

  it('given a forged guest bank, when merged, then credited coins are capped by the guest runs', () => {
    const merged = mergeGuestEstate(withPlots([], { runs: 1 }), withPlots([], { coins: 900_000, runs: 1 }));
    expect(merged.coins).toBeLessThanOrEqual(1000);
  });
});

describe('braces — the paid stabilise', () => {
  it('given successive paid braces, when priced, then each costs double the last', () => {
    expect(braceCost(1, 1)).toBe(40);
    expect(braceCost(2, 1)).toBe(80);
    expect(braceCost(3, 1)).toBe(160);
  });

  it('given free braces from the Steel Braces upgrade, when quoted, then they cost 0 until used up', () => {
    expect(nextBracePrice(0, 1, 1)).toBe(0);
    expect(nextBracePrice(1, 1, 1)).toBe(40);
    expect(nextBracePrice(2, 1, 1)).toBe(80);
  });

  it('given a fresh estate, then no free braces; bracing (insurance) levels grant them', () => {
    expect(NEUTRAL_PERKS.freeBraces).toBe(0);
    expect(perksFromEstate(withPlots([0, 0, 0, 2])).freeBraces).toBe(1);
    expect(perksFromEstate(withPlots([0, 0, 0, 5])).freeBraces).toBe(2);
  });

  it('given paid braces in the summary, when coins are computed, then their price comes off the run (never below 0)', () => {
    const base = runCoins(RUN);
    expect(runCoins({ ...RUN, braces: 2 })).toBe(base - 40 - 80);
    expect(runCoins({ ...RUN, braces: 2 }, { freeBraces: 1 })).toBe(base - 40);
    expect(runCoins({ floors: 1, perfects: 0, bestCombo: 0, crates: 0, heightM: 1, braces: 5 })).toBe(0);
  });

  it('given a forged brace count, when clamped, then it stays within 0..5', () => {
    expect(clampRunSummary({ ...RUN, braces: 99 }).braces).toBe(5);
    expect(clampRunSummary({ ...RUN, braces: -3 }).braces).toBe(0);
    expect(clampRunSummary(RUN).braces).toBe(0);
  });

  it('given a run with braces, when banked, then the bank reflects the charge', () => {
    const plain = applyRun(emptyEstate(), RUN, 7);
    const braced = applyRun(emptyEstate(), { ...RUN, braces: 1 }, 7);
    expect(plain.estate.coins - braced.estate.coins).toBe(40);
  });
});
