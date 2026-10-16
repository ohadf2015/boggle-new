/** Boss Battle v2 wire contract: a classic board round where the whole class fights one server-owned boss. */

export const CLASSROOM_BOSS_IDS = [
  'lexiconDragon',
  'msGrammar',
  'spellingBee',
  'professorThesaurus',
  'captainMetaphor',
  'baronBuildaword',
  'puzzleMaster',
  'reflectionKing',
  'cosmicWordsmith',
  'linguistSage',
] as const;
export type ClassroomBossId = (typeof CLASSROOM_BOSS_IDS)[number];

/** The one boss a free teacher gets; the other nine are a Pro perk. */
export const FREE_CLASSROOM_BOSS_ID: ClassroomBossId = 'lexiconDragon';

export function isClassroomBossId(value: unknown): value is ClassroomBossId {
  return typeof value === 'string' && (CLASSROOM_BOSS_IDS as readonly string[]).includes(value);
}

export type ClassroomBossAttackKind = 'freeze' | 'blur' | 'drain';
export type ClassroomBossStatus = 'intro' | 'fighting' | 'phase-change' | 'defeated' | 'escaped';
export type ClassroomBossPhase = 1 | 2 | 3;

export interface BossTile {
  row: number;
  col: number;
}

export interface ClassroomBossHit {
  /** Monotonic per round, so the projector can key one projectile per hit. */
  id: number;
  username: string;
  word: string;
  dmg: number;
  crit: boolean;
  /** Landed while the boss was exposed (optional: older servers never send it). */
  exposed?: boolean;
}

export interface ClassroomBossView {
  bossId: ClassroomBossId;
  hp: number;
  maxHp: number;
  phase: ClassroomBossPhase;
  status: ClassroomBossStatus;
  /** Relative times only (ms left), so a skewed client clock never shows a wrong countdown. */
  telegraph: { kind: ClassroomBossAttackKind; msLeft: number; totalMs: number; longWords: number; need: number } | null;
  /** Ms until the next telegraph opens (null while one is open or the fight is over). */
  nextAttackMs: number | null;
  shield: number;
  shieldMax: number;
  combo: { count: number; multiplier: number; msLeft: number };
  lastHits: ClassroomBossHit[];
  topHitters: Array<{ username: string; dmg: number }>;
  effect: { kind: ClassroomBossAttackKind; tiles: BossTile[]; msLeft: number } | null;
  /** Times the class cancelled an attack; an increment is the stagger cue. */
  staggers: number;
  /** Open after a stagger; optional so older servers' views still parse. */
  exposed?: { msLeft: number; totalMs: number } | null;
  pctDealt: number;
}

export interface ClassroomBossAttackEvent {
  kind: ClassroomBossAttackKind;
  blocked: boolean;
  healed: number;
  tiles: BossTile[];
}

/** Per-player damage, carried inside `wordAccepted` / `wordAlreadyFoundByOther` as `boss`. */
export interface ClassroomBossPlayerHit {
  dmg: number;
  crit: boolean;
  multiplier: number;
  totalDmg: number;
}

export const CLASSROOM_BOSS_EVENTS = {
  state: 'classroomBoss:state',
  attack: 'classroomBoss:attack',
} as const;

/** Why the server refused a word in a boss round (sent as `wordRejected.reason`). */
export const BOSS_FROZEN_REASON = 'boss_frozen' as const;
