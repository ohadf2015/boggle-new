/**
 * Boss Battle v2 — a pure, seeded reducer. The game timer drives `tick`; every accepted word drives
 * `applyWord`. No IO, no Date.now: callers pass `now`, so a replay with the same seed is identical.
 */
import { hashSeed, nextRandom } from '@/lib/adventure/play/rng';
import type {
  BossTile,
  ClassroomBossAttackEvent,
  ClassroomBossAttackKind,
  ClassroomBossHit,
  ClassroomBossId,
  ClassroomBossPhase,
  ClassroomBossStatus,
  ClassroomBossView,
} from '@/shared/types/classroomBoss';
import { BOSS_RULES as R } from './rules';

export interface BossTelegraph {
  kind: ClassroomBossAttackKind;
  startsAt: number;
  landsAt: number;
  longWords: number;
}

export interface BossState {
  bossId: ClassroomBossId;
  maxHp: number;
  hp: number;
  phase: ClassroomBossPhase;
  status: ClassroomBossStatus;
  pausedUntil: number;
  combo: { count: number; lastAt: number };
  shield: number;
  telegraph: BossTelegraph | null;
  nextTelegraphAt: number;
  effect: { kind: ClassroomBossAttackKind; tiles: BossTile[]; until: number } | null;
  damageBy: Record<string, number>;
  lastHits: ClassroomBossHit[];
  hitSeq: number;
  staggers: number;
  exposedUntil: number;
  rng: number;
  rows: number;
  cols: number;
}

export type BossEventName = 'phase' | 'staggered' | 'defeated' | 'telegraph' | 'attack' | 'effect-end' | 'started';

export interface BossCreateInput {
  seed: string;
  bossId: ClassroomBossId;
  students: number;
  roundSeconds: number;
  rows: number;
  cols: number;
  now: number;
}

/** A big class keeps the combo near x4, so its HP grows faster than linearly in head count. */
export function bossMaxHp(students: number, roundSeconds: number): number {
  const n = Math.max(0, students);
  const comboFactor = Math.min(4, 1 + n / 6);
  return Math.max(R.minHp, Math.round(n * Math.max(0, roundSeconds) * R.hpPerStudentSecond * comboFactor));
}

export function comboMultiplier(count: number): number {
  if (count >= 10) return 4;
  if (count >= 6) return 3;
  if (count >= 3) return 2;
  return 1;
}

export function createBoss(input: BossCreateInput): BossState {
  const maxHp = bossMaxHp(input.students, input.roundSeconds);
  const fightAt = input.now + R.introMs;
  return {
    bossId: input.bossId,
    maxHp,
    hp: maxHp,
    phase: 1,
    status: 'intro',
    pausedUntil: fightAt,
    combo: { count: 0, lastAt: -Infinity },
    shield: 0,
    telegraph: null,
    nextTelegraphAt: fightAt + R.openingMs,
    effect: null,
    damageBy: {},
    lastHits: [],
    hitSeq: 0,
    staggers: 0,
    exposedUntil: 0,
    rng: hashSeed(input.seed),
    rows: Math.max(1, input.rows),
    cols: Math.max(1, input.cols),
  };
}

const isOver = (s: BossState) => s.status === 'defeated' || s.status === 'escaped';

function phaseFor(hp: number, maxHp: number): ClassroomBossPhase {
  const ratio = hp / maxHp;
  if (ratio > R.phaseAt[0]) return 1;
  if (ratio > R.phaseAt[1]) return 2;
  return 3;
}

export interface WordInput {
  username: string;
  word: string;
  score: number;
  now: number;
}

export interface WordResult {
  state: BossState;
  hit: (Omit<ClassroomBossHit, 'id'> & { multiplier: number }) | null;
  events: BossEventName[];
}

export function applyWord(s: BossState, w: WordInput): WordResult {
  if (isOver(s) || w.score <= 0) return { state: s, hit: null, events: [] };
  const events: BossEventName[] = [];
  const len = [...w.word].length;
  const count = w.now - s.combo.lastAt <= R.comboWindowMs ? s.combo.count + 1 : 1;
  const multiplier = comboMultiplier(count);
  const crit = len >= R.critLen;
  const exposed = w.now < s.exposedUntil;
  const raw = Math.max(1, Math.round(w.score * (crit ? 2 : 1) * multiplier * (exposed ? R.exposedMult : 1)));
  // Armor: word scores are exponential, so one long crit at x4 would otherwise one-shot a small class's boss.
  const dmg = Math.min(raw, Math.ceil(s.maxHp * R.maxHitPct));
  const hp = Math.max(0, s.hp - dmg);
  const hit = { username: w.username, word: w.word, dmg, crit, multiplier };

  let next: BossState = {
    ...s,
    hp,
    combo: { count, lastAt: w.now },
    shield: len >= R.shieldLen ? Math.min(R.shieldMax, s.shield + 1) : s.shield,
    damageBy: { ...s.damageBy, [w.username]: (s.damageBy[w.username] ?? 0) + dmg },
    hitSeq: s.hitSeq + 1,
    lastHits: [{ id: s.hitSeq + 1, username: w.username, word: w.word, dmg, crit, ...(exposed && { exposed }) }, ...s.lastHits].slice(0, R.lastHits),
  };

  if (next.telegraph && len >= R.staggerLen) {
    const longWords = next.telegraph.longWords + 1;
    if (longWords >= R.staggerWords) {
      next = { ...next, telegraph: null, nextTelegraphAt: w.now + R.cadenceMs[next.phase - 1], staggers: next.staggers + 1, exposedUntil: w.now + R.exposedMs };
      events.push('staggered');
    } else {
      next = { ...next, telegraph: { ...next.telegraph, longWords } };
    }
  }

  if (hp === 0) {
    return { state: { ...next, status: 'defeated', telegraph: null, effect: null }, hit, events: [...events, 'defeated'] };
  }

  const phase = phaseFor(hp, s.maxHp);
  if (phase > next.phase) {
    const pausedUntil = w.now + R.phasePauseMs;
    next = {
      ...next,
      phase,
      status: 'phase-change',
      pausedUntil,
      telegraph: null,
      nextTelegraphAt: pausedUntil + Math.round(R.cadenceMs[phase - 1] / 2),
    };
    events.push('phase');
  }
  return { state: next, hit, events };
}

function draw(s: BossState): [number, BossState] {
  const [v, rng] = nextRandom(s.rng);
  return [v, { ...s, rng }];
}

function pickTiles(s: BossState, n: number): [BossTile[], BossState] {
  const cells: BossTile[] = [];
  for (let row = 0; row < s.rows; row++) for (let col = 0; col < s.cols; col++) cells.push({ row, col });
  const out: BossTile[] = [];
  let cur = s;
  while (out.length < Math.min(n, cells.length)) {
    const [v, after] = draw(cur);
    cur = after;
    const i = Math.floor(v * cells.length);
    out.push(...cells.splice(i, 1));
  }
  return [out, cur];
}

function land(s: BossState, now: number): { state: BossState; attack: ClassroomBossAttackEvent } {
  const kind = s.telegraph!.kind;
  const base: BossState = { ...s, telegraph: null, nextTelegraphAt: now + R.cadenceMs[s.phase - 1] };
  if (s.shield > 0) {
    const cost = kind === 'drain' ? Math.min(R.drainCharges, s.shield) : 1;
    return { state: { ...base, shield: s.shield - cost }, attack: { kind, blocked: true, healed: 0, tiles: [] } };
  }
  const healed = Math.min(s.maxHp - s.hp, Math.ceil(s.maxHp * R.healPct));
  let state: BossState = { ...base, hp: s.hp + healed };
  let tiles: BossTile[] = [];
  if (kind === 'freeze') {
    [tiles, state] = pickTiles(state, R.freezeTiles);
    state = { ...state, effect: { kind, tiles, until: now + R.freezeMs } };
  } else if (kind === 'blur') {
    state = { ...state, effect: { kind, tiles: [], until: now + R.blurMs } };
  }
  return { state, attack: { kind, blocked: false, healed, tiles } };
}

export interface TickResult {
  state: BossState;
  events: BossEventName[];
  attack: ClassroomBossAttackEvent | null;
}

export function tick(s: BossState, now: number): TickResult {
  if (isOver(s)) return { state: s, events: [], attack: null };
  const events: BossEventName[] = [];
  let state = s;
  if ((state.status === 'intro' || state.status === 'phase-change') && now >= state.pausedUntil) {
    if (state.status === 'intro') events.push('started');
    state = { ...state, status: 'fighting' };
  }
  if (state.combo.count > 0 && now - state.combo.lastAt > R.comboWindowMs) {
    state = { ...state, combo: { ...state.combo, count: 0 } };
  }
  if (state.effect && now >= state.effect.until) {
    state = { ...state, effect: null };
    events.push('effect-end');
  }
  if (state.status !== 'fighting') return { state, events, attack: null };

  if (!state.telegraph && now >= state.nextTelegraphAt) {
    const pool = R.attackPool[state.phase - 1];
    const [v, after] = draw(state);
    const kind = pool[Math.floor(v * pool.length)];
    state = { ...after, telegraph: { kind, startsAt: now, landsAt: now + R.telegraphMs[state.phase - 1], longWords: 0 } };
    events.push('telegraph');
    return { state, events, attack: null };
  }
  if (state.telegraph && now >= state.telegraph.landsAt) {
    const landed = land(state, now);
    events.push('attack');
    return { state: landed.state, events, attack: landed.attack };
  }
  return { state, events, attack: null };
}

export function endBossRound(s: BossState): BossState {
  if (isOver(s)) return s;
  return { ...s, status: 'escaped', telegraph: null, effect: null };
}

export function frozenTiles(s: BossState, now: number): BossTile[] {
  return s.effect?.kind === 'freeze' && now < s.effect.until ? s.effect.tiles : [];
}

export function toView(s: BossState, now: number): ClassroomBossView {
  const t = s.telegraph;
  const topHitters = Object.entries(s.damageBy)
    .map(([username, dmg]) => ({ username, dmg }))
    .sort((a, b) => b.dmg - a.dmg || a.username.localeCompare(b.username))
    .slice(0, R.topHitters);
  const comboLive = s.combo.count > 0 && now - s.combo.lastAt <= R.comboWindowMs;
  return {
    bossId: s.bossId,
    hp: s.hp,
    maxHp: s.maxHp,
    phase: s.phase,
    status: s.status,
    telegraph: t
      ? { kind: t.kind, msLeft: Math.max(0, t.landsAt - now), totalMs: t.landsAt - t.startsAt, longWords: t.longWords, need: R.staggerWords }
      : null,
    nextAttackMs: !t && !isOver(s) ? Math.max(0, s.nextTelegraphAt - now) : null,
    shield: s.shield,
    shieldMax: R.shieldMax,
    combo: comboLive
      ? { count: s.combo.count, multiplier: comboMultiplier(s.combo.count), msLeft: R.comboWindowMs - (now - s.combo.lastAt) }
      : { count: 0, multiplier: 1, msLeft: 0 },
    lastHits: s.lastHits,
    topHitters,
    effect: s.effect && now < s.effect.until ? { kind: s.effect.kind, tiles: s.effect.tiles, msLeft: s.effect.until - now } : null,
    staggers: s.staggers,
    exposed: !isOver(s) && now < s.exposedUntil ? { msLeft: s.exposedUntil - now, totalMs: R.exposedMs } : null,
    pctDealt: Math.round(((s.maxHp - s.hp) / s.maxHp) * 100),
  };
}

/** Push every deadline forward by `ms` (teacher pause, or the 3-2-1 that delayed the round clock). */
export function shiftBoss(s: BossState, ms: number): BossState {
  if (ms <= 0) return s;
  return {
    ...s,
    pausedUntil: s.pausedUntil + ms,
    nextTelegraphAt: s.nextTelegraphAt + ms,
    combo: { ...s.combo, lastAt: s.combo.lastAt + ms },
    telegraph: s.telegraph ? { ...s.telegraph, startsAt: s.telegraph.startsAt + ms, landsAt: s.telegraph.landsAt + ms } : null,
    effect: s.effect ? { ...s.effect, until: s.effect.until + ms } : null,
    exposedUntil: s.exposedUntil > 0 ? s.exposedUntil + ms : 0,
  };
}
