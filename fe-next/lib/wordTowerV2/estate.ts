/**
 * Word Tower v2 empire economy. Pure — the SAME functions run on the server
 * (routes recompute every number; client coins/damage are never trusted) and
 * for guests in localStorage.
 *
 * Loop (Coin Master shape): a run pays coins + a chest -> coins buy plot
 * upgrades -> plots grant perks that make the next run steadier -> five maxed
 * plots complete the district -> the next district costs more and pays more.
 * Raids steal coins and damage one plot; a shield blocks a raid; revenge pays.
 *
 * Tuning targets (tests pin them, scripts/wordTowerEstateSim.ts reports them):
 * first upgrade affordable after one run; district 1 in 15-21 median runs
 * (5-7 days at 3/day); a chest is never empty; rare ~15%, epic ~3%.
 */
import { MAX_DISTRICT, MAX_PLOT_LEVEL, PLOT_SLOTS, type PlotSlot } from './estateCatalog';
import { type TowerBlock, decodeTower, encodeTower } from './estateTower';

export type { PlotSlot } from './estateCatalog';
export type { TowerBlock } from './estateTower';

export interface Plot {
  slot: PlotSlot;
  level: number;
  /** Raided: counts one level lower for perks and must be repaired before upgrading. */
  damaged: boolean;
}

export interface Estate {
  coins: number;
  /** 1-based. */
  district: number;
  /** Always one per slot, in PLOT_SLOTS order. */
  plots: Plot[];
  shields: number;
  /** Golden bricks: a free repair each (rare chests). */
  bricks: number;
  /** Blueprints: a free upgrade each (epic chests, district completion). */
  blueprints: number;
  /** Raids you may launch — one earned per run, capped. */
  raidCharges: number;
  bestM: number;
  runs: number;
  /** The best run's tower, for rivals to see and wreck. */
  lastTower: TowerBlock[];
}

export interface RunSummary {
  floors: number;
  perfects: number;
  bestCombo: number;
  crates: number;
  heightM: number;
  /** Emergency braces BOUGHT this run (free ones are not counted); priced by `braceCost`. */
  braces?: number;
  tower?: TowerBlock[];
}

export type ChestTier = 'common' | 'rare' | 'epic';

export interface ChestRoll {
  tier: ChestTier;
  coins: number;
  shields: number;
  bricks: number;
  blueprints: number;
}

/** Plain multipliers the run consumes. All exactly 1 on a fresh estate. */
export interface Perks {
  /** Ground-floor block width (Foundation). */
  baseWidthMult: number;
  /** Tower sway / wobble (Foundation); < 1 is steadier. */
  swayMult: number;
  /** Crane swing period (Crane Yard); > 1 is slower. */
  swingPeriodMult: number;
  /** PERFECT_RATIO band (Crane Yard). */
  perfectWindowMult: number;
  /** Run coins (Vault). */
  coinMult: number;
  /** Max shields held (Insurance). */
  shieldCap: number;
  /** Run score (Landmark). */
  scoreMult: number;
  /** Emergency braces per run that cost nothing (Steel Braces / insurance). */
  freeBraces: number;
}

export type RaidOutcome =
  | { kind: 'blocked'; attackerCoins: number }
  | { kind: 'damaged'; slot: PlotSlot | null; coinsStolen: number; attackerCoins: number };

export type SpendResult =
  | { ok: true; estate: Estate; cost: number; usedToken: boolean }
  | { ok: false; reason: 'maxed' | 'damaged' | 'coins' | 'intact' | 'unknown' };

// ── Tuning ───────────────────────────────────────────────────────────────────

const MAX_FLOORS = 100;
const MAX_CRATES = 30;
const MAX_HEIGHT_M = 400;
const MAX_RUN_COINS = 3000;
const MAX_COINS = 1_000_000_000;
export const MAX_RAID_CHARGES = 3;
const MAX_TOKENS = 99;
export const MAX_BRACES = 5;
const BRACE_BASE = 40;
/** A guest bank credited on sign-in is capped per guest run: localStorage is forgeable. */
const GUEST_COINS_PER_RUN = 1000;

const UPGRADE_BASE = 60;
const LEVEL_GROWTH = 1.5;
const SLOT_FACTOR: Record<PlotSlot, number> = { foundation: 1, craneYard: 1.15, vault: 1.3, insurance: 1.45, landmark: 1.6 };
const DISTRICT_COST_GROWTH = 1.6;
const DISTRICT_YIELD_GROWTH = 1.35;
const REPAIR_FRACTION = 0.4;

export const NEUTRAL_PERKS: Perks = {
  baseWidthMult: 1,
  swayMult: 1,
  swingPeriodMult: 1,
  perfectWindowMult: 1,
  coinMult: 1,
  shieldCap: 2,
  scoreMult: 1,
  freeBraces: 0,
};

const clampInt = (v: unknown, lo: number, hi: number): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? Math.floor(v) : lo;
  return Math.min(hi, Math.max(lo, n));
};
const clampDistrict = (d: number) => clampInt(d, 1, MAX_DISTRICT);
const costScale = (d: number) => DISTRICT_COST_GROWTH ** (clampDistrict(d) - 1);
const yieldScale = (d: number) => DISTRICT_YIELD_GROWTH ** (clampDistrict(d) - 1);

export function emptyEstate(): Estate {
  return {
    coins: 0,
    district: 1,
    plots: PLOT_SLOTS.map((slot) => ({ slot, level: 0, damaged: false })),
    shields: 0,
    bricks: 0,
    blueprints: 0,
    raidCharges: 0,
    bestM: 0,
    runs: 0,
    lastTower: [],
  };
}

// ── Runs & chests ────────────────────────────────────────────────────────────

/** Untrusted summary -> consistent one (perfects <= floors, combo <= perfects, ...). */
export function clampRunSummary(raw: Partial<RunSummary>): RunSummary {
  const floors = clampInt(raw.floors, 0, MAX_FLOORS);
  const perfects = clampInt(raw.perfects, 0, floors);
  const heightM = Math.min(MAX_HEIGHT_M, Math.max(0, Number(raw.heightM) || 0));
  return {
    floors,
    perfects,
    bestCombo: clampInt(raw.bestCombo, 0, perfects),
    crates: clampInt(raw.crates, 0, Math.min(MAX_CRATES, floors)),
    heightM: Math.round(heightM * 10) / 10,
    braces: clampInt(raw.braces, 0, MAX_BRACES),
    ...(raw.tower ? { tower: decodeTower(raw.tower) } : {}),
  };
}

export function runCoins(raw: RunSummary, opts: { district?: number; coinMult?: number; freeBraces?: number } = {}): number {
  const s = clampRunSummary(raw);
  const district = opts.district ?? 1;
  const base = 40 + 8 * s.floors + 6 * s.perfects + 5 * s.bestCombo + 10 * s.crates;
  const mult = Math.min(2, Math.max(1, opts.coinMult ?? 1));
  const earned = Math.min(Math.round(MAX_RUN_COINS * yieldScale(district)), Math.round(base * mult * yieldScale(district)));
  const paid = Math.max(0, (s.braces ?? 0) - Math.max(0, opts.freeBraces ?? 0));
  let spent = 0;
  for (let n = 1; n <= paid; n += 1) spent += braceCost(n, district);
  return Math.max(0, earned - spent);
}

/** Price of the n-th PAID brace in one run (1-based): doubles each time. */
export function braceCost(n: number, district = 1): number {
  return Math.round(BRACE_BASE * 2 ** (clampInt(n, 1, MAX_BRACES) - 1) * yieldScale(district));
}

/** What the next brace costs after `used` this run: free ones first, then braceCost. */
export function nextBracePrice(used: number, freeBraces: number, district = 1): number {
  return used < freeBraces ? 0 : braceCost(used - freeBraces + 1, district);
}

/** 0..1: half height (16 floors = full), half perfect-rate. */
export function runQuality(raw: RunSummary): number {
  const s = clampRunSummary(raw);
  const q = 0.5 * Math.min(1, s.floors / 16) + 0.5 * (s.floors ? s.perfects / s.floors : 0);
  return Math.min(1, Math.max(0, q));
}

export function chestOdds(quality: number): { rare: number; epic: number } {
  const q = Math.min(1, Math.max(0, quality));
  return { rare: 0.12 + 0.06 * q, epic: 0.02 + 0.02 * q };
}

/** mulberry32 — tiny, seedable, good enough for loot. */
function rng(seed: number): () => number {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Server-side chest seed: the player can't pick it (FNV-1a of id, mixed with the run count). */
export function chestSeed(playerId: string, runs: number): number {
  let h = 0x811c9dc5;
  const s = `${playerId}:${runs}`;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

const CHEST_COINS: Record<ChestTier, [number, number]> = { common: [25, 70], rare: [90, 180], epic: [250, 450] };

export function rollChest(seed: number, quality: number, district = 1): ChestRoll {
  const r = rng(seed);
  const odds = chestOdds(quality);
  const roll = r();
  const tier: ChestTier = roll < odds.epic ? 'epic' : roll < odds.epic + odds.rare ? 'rare' : 'common';
  const [lo, hi] = CHEST_COINS[tier];
  const coins = Math.round((lo + r() * (hi - lo)) * yieldScale(district));
  const shieldRoll = r();
  return {
    tier,
    coins,
    shields: tier === 'epic' || (tier === 'rare' && shieldRoll < 0.3) || shieldRoll < 0.12 ? 1 : 0,
    bricks: tier === 'rare' ? 1 : 0,
    blueprints: tier === 'epic' ? 1 : 0,
  };
}

/** Mean chest coins at this quality (for tuning tests and the sim). */
export function expectedChestCoins(quality: number, district = 1): number {
  const o = chestOdds(quality);
  const mid = (t: ChestTier) => (CHEST_COINS[t][0] + CHEST_COINS[t][1]) / 2;
  return (o.epic * mid('epic') + o.rare * mid('rare') + (1 - o.rare - o.epic) * mid('common')) * yieldScale(district);
}

/** Bank a run: coins (vault-boosted) + chest, best height, a raid charge, the tower. */
export function applyRun(estate: Estate, raw: RunSummary, seed: number): { estate: Estate; coins: number; chest: ChestRoll } {
  const s = clampRunSummary(raw);
  const perks = perksFromEstate(estate);
  const coins = runCoins(s, { district: estate.district, coinMult: perks.coinMult, freeBraces: perks.freeBraces });
  const chest = rollChest(seed, runQuality(s), estate.district);
  const isBest = s.heightM >= estate.bestM;
  const next: Estate = {
    ...estate,
    coins: Math.min(MAX_COINS, estate.coins + coins + chest.coins),
    shields: Math.min(perks.shieldCap, estate.shields + chest.shields),
    bricks: Math.min(MAX_TOKENS, estate.bricks + chest.bricks),
    blueprints: Math.min(MAX_TOKENS, estate.blueprints + chest.blueprints),
    raidCharges: Math.min(MAX_RAID_CHARGES, estate.raidCharges + 1),
    bestM: Math.max(estate.bestM, s.heightM),
    runs: estate.runs + 1,
    lastTower: s.tower && s.tower.length && (isBest || !estate.lastTower.length) ? decodeTower(encodeTower(s.tower)) : estate.lastTower,
  };
  return { estate: next, coins, chest };
}

// ── Upgrades & repairs ───────────────────────────────────────────────────────

/** Cost to take `slot` from `level` to `level + 1` in `district`. */
export function upgradeCost(district: number, slot: PlotSlot, level: number): number {
  const l = clampInt(level, 0, MAX_PLOT_LEVEL - 1);
  return Math.round(UPGRADE_BASE * SLOT_FACTOR[slot] * LEVEL_GROWTH ** l * costScale(district));
}

/** Repair a plot raided at `level`: a fraction of what that level cost to build. */
export function repairCost(district: number, slot: PlotSlot, level: number): number {
  if (level <= 0) return 0;
  return Math.max(1, Math.ceil(upgradeCost(district, slot, level - 1) * REPAIR_FRACTION));
}

const plotOf = (e: Estate, slot: PlotSlot) => e.plots.find((p) => p.slot === slot);

const withPlot = (e: Estate, slot: PlotSlot, patch: Partial<Plot>): Plot[] =>
  e.plots.map((p) => (p.slot === slot ? { ...p, ...patch } : p));

export function canUpgrade(e: Estate, slot: PlotSlot): { ok: true; cost: number; useBlueprint: boolean } | { ok: false; reason: 'maxed' | 'damaged' | 'coins' | 'unknown' } {
  const p = plotOf(e, slot);
  if (!p) return { ok: false, reason: 'unknown' };
  if (p.level >= MAX_PLOT_LEVEL) return { ok: false, reason: 'maxed' };
  if (p.damaged) return { ok: false, reason: 'damaged' };
  if (e.blueprints > 0) return { ok: true, cost: 0, useBlueprint: true };
  const cost = upgradeCost(e.district, slot, p.level);
  if (e.coins < cost) return { ok: false, reason: 'coins' };
  return { ok: true, cost, useBlueprint: false };
}

/** Blueprint first (free), else coins. Does NOT advance the district — call advanceDistrict. */
export function applyUpgrade(e: Estate, slot: PlotSlot): SpendResult {
  const check = canUpgrade(e, slot);
  if (!check.ok) return check;
  const p = plotOf(e, slot)!;
  return {
    ok: true,
    cost: check.cost,
    usedToken: check.useBlueprint,
    estate: {
      ...e,
      coins: e.coins - check.cost,
      blueprints: e.blueprints - (check.useBlueprint ? 1 : 0),
      plots: withPlot(e, slot, { level: p.level + 1 }),
    },
  };
}

/** Golden brick first (free), else coins. */
export function applyRepair(e: Estate, slot: PlotSlot): SpendResult {
  const p = plotOf(e, slot);
  if (!p) return { ok: false, reason: 'unknown' };
  if (!p.damaged) return { ok: false, reason: 'intact' };
  const useBrick = e.bricks > 0;
  const cost = useBrick ? 0 : repairCost(e.district, slot, p.level);
  if (e.coins < cost) return { ok: false, reason: 'coins' };
  return {
    ok: true,
    cost,
    usedToken: useBrick,
    estate: { ...e, coins: e.coins - cost, bricks: e.bricks - (useBrick ? 1 : 0), plots: withPlot(e, slot, { damaged: false }) },
  };
}

// ── Districts ────────────────────────────────────────────────────────────────

export function districtComplete(e: Estate): boolean {
  return e.plots.length === PLOT_SLOTS.length && e.plots.every((p) => p.level >= MAX_PLOT_LEVEL && !p.damaged);
}

/** Reward for finishing a district, paid by advanceDistrict. */
export function districtReward(district: number): { coins: number; blueprints: number; shields: number } {
  return { coins: Math.round(300 * yieldScale(district)), blueprints: 1, shields: 1 };
}

/** Completed -> next district with fresh plots + a reward. Otherwise (or at the last district) unchanged. */
export function advanceDistrict(e: Estate): Estate {
  if (!districtComplete(e) || e.district >= MAX_DISTRICT) return e;
  const reward = districtReward(e.district);
  const next: Estate = {
    ...e,
    district: e.district + 1,
    coins: Math.min(MAX_COINS, e.coins + reward.coins),
    blueprints: Math.min(MAX_TOKENS, e.blueprints + reward.blueprints),
    plots: PLOT_SLOTS.map((slot) => ({ slot, level: 0, damaged: false })),
  };
  return { ...next, shields: Math.min(perksFromEstate(next).shieldCap, e.shields + reward.shields) };
}

// ── Perks ────────────────────────────────────────────────────────────────────

/** Levels a slot has earned across the whole empire: finished districts count 5 each. */
export function slotLevels(e: Estate, slot: PlotSlot): number {
  const p = plotOf(e, slot);
  const here = p ? Math.max(0, p.level - (p.damaged ? 1 : 0)) : 0;
  return (clampDistrict(e.district) - 1) * MAX_PLOT_LEVEL + here;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function perksFromEstate(e: Estate): Perks {
  const f = slotLevels(e, 'foundation');
  const c = slotLevels(e, 'craneYard');
  const v = slotLevels(e, 'vault');
  const i = slotLevels(e, 'insurance');
  const l = slotLevels(e, 'landmark');
  return {
    baseWidthMult: r3(1 + Math.min(0.25, 0.02 * f)),
    swayMult: r3(1 - Math.min(0.3, 0.025 * f)),
    swingPeriodMult: r3(1 + Math.min(0.2, 0.015 * c)),
    perfectWindowMult: r3(1 + Math.min(0.2, 0.02 * c)),
    coinMult: r3(1 + Math.min(1, 0.04 * v)),
    shieldCap: NEUTRAL_PERKS.shieldCap + Math.min(3, Math.floor(i / 4)),
    scoreMult: r3(1 + Math.min(0.5, 0.03 * l)),
    freeBraces: Math.min(3, Math.floor((i + 1) / 2.5)),
  };
}

// ── Raids ────────────────────────────────────────────────────────────────────

/**
 * Deterministic: a shield blocks; otherwise the defender's best intact plot is
 * damaged and a slice of their coins (more with better aim, capped per
 * district) is stolen. The attacker is paid either way; revenge pays 1.5x.
 */
export function raidOutcome(input: { attackerAccuracy: number; defender: Estate; revenge: boolean }): RaidOutcome {
  const acc = Math.min(1, Math.max(0, Number(input.attackerAccuracy) || 0));
  const d = input.defender;
  const scale = yieldScale(d.district);
  const bonus = input.revenge ? 1.5 : 1;
  if (d.shields > 0) return { kind: 'blocked', attackerCoins: Math.round((15 + 15 * acc) * scale * bonus) };

  let target: Plot | null = null;
  for (const p of d.plots) if (!p.damaged && p.level > 0 && (!target || p.level > target.level)) target = p;
  const cap = Math.round(120 * scale);
  const coinsStolen = Math.min(cap, Math.floor(Math.max(0, d.coins) * (0.08 + 0.12 * acc)));
  return {
    kind: 'damaged',
    slot: target?.slot ?? null,
    coinsStolen,
    attackerCoins: Math.round((25 + 25 * acc) * scale * bonus) + coinsStolen,
  };
}

export function applyRaidToDefender(e: Estate, out: RaidOutcome): Estate {
  if (out.kind === 'blocked') return { ...e, shields: Math.max(0, e.shields - 1) };
  return {
    ...e,
    coins: Math.max(0, e.coins - out.coinsStolen),
    plots: out.slot ? withPlot(e, out.slot, { damaged: true }) : e.plots,
  };
}

export function applyRaidToAttacker(e: Estate, out: RaidOutcome): Estate {
  return { ...e, coins: Math.min(MAX_COINS, e.coins + out.attackerCoins), raidCharges: Math.max(0, e.raidCharges - 1) };
}

// ── Untrusted input ──────────────────────────────────────────────────────────

/** jsonb / localStorage -> a valid Estate. Unknown slots dropped, missing slots filled. */
export function sanitizeEstate(raw: unknown): Estate {
  if (!raw || typeof raw !== 'object') return emptyEstate();
  const o = raw as Record<string, unknown>;
  const rawPlots = Array.isArray(o.plots) ? o.plots : [];
  const plots = PLOT_SLOTS.map((slot) => {
    const p = rawPlots.find((x): x is Record<string, unknown> => !!x && typeof x === 'object' && (x as Plot).slot === slot);
    const level = clampInt(p?.level, 0, MAX_PLOT_LEVEL);
    return { slot, level, damaged: p?.damaged === true && level > 0 };
  });
  const base: Estate = {
    coins: clampInt(o.coins, 0, MAX_COINS),
    district: clampDistrict(o.district as number),
    plots,
    shields: 0,
    bricks: clampInt(o.bricks, 0, MAX_TOKENS),
    blueprints: clampInt(o.blueprints, 0, MAX_TOKENS),
    raidCharges: clampInt(o.raidCharges, 0, MAX_RAID_CHARGES),
    bestM: Math.min(MAX_HEIGHT_M, Math.max(0, Number.isFinite(o.bestM as number) ? (o.bestM as number) : 0)),
    runs: clampInt(o.runs, 0, MAX_COINS),
    lastTower: decodeTower(o.lastTower),
  };
  return { ...base, shields: clampInt(o.shields, 0, perksFromEstate(base).shieldCap) };
}

// ── Guest -> account ─────────────────────────────────────────────────────────

/** Coins a guest plot's levels cost to build — refunded when the account keeps its own plots. */
function builtValue(e: Estate): number {
  let v = 0;
  for (const p of e.plots) for (let l = 0; l < p.level; l += 1) v += upgradeCost(e.district, p.slot, l);
  return v;
}

/**
 * A guest signs in: what they built signed-out must not vanish. The account
 * keeps its own plots and district and is credited the guest's coins plus
 * what the guest's upgrades cost, so they can rebuild at once. Everything
 * comes from localStorage (forgeable), so plots/district are NEVER adopted —
 * only coins, capped per guest run.
 */
export function mergeGuestEstate(account: Estate, guest: Estate): Estate {
  if (guest.runs <= 0) return account;
  const cap = GUEST_COINS_PER_RUN * guest.runs;
  return sanitizeEstate({
    ...account,
    coins: account.coins + Math.min(cap, guest.coins + builtValue(guest)),
    runs: account.runs + guest.runs,
    bestM: Math.max(account.bestM, guest.bestM),
    bricks: account.bricks + guest.bricks,
    blueprints: account.blueprints + guest.blueprints,
    shields: account.shields + guest.shields,
  });
}
