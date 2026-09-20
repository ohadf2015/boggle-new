/**
 * The victory ledger: the run, itemized.
 *
 * The bar is Slay the Spire's victory screen — Floors / Enemies / Elites /
 * Bosses / Money, each line carrying its OWN point contribution, summing to one
 * final score. Our recap used to show four flat facts (levels, gold, best word,
 * relics) with no arithmetic, so nothing on it said which parts of the run were
 * worth walking.
 *
 * Counts are read off the act map the run actually walked — `map.nodes` indexed
 * by `run.path` — and never off a second tally in storage. One source of truth
 * (Class 1 in .claude/rules/60-recurring-pitfalls.md): a reload rebuilds the
 * same map from the same seed, so the ledger cannot drift from the map screen.
 *
 * This total is a RUN score, derived here and nowhere else: it is never
 * persisted, never sent, and deliberately not the season/leaderboard number the
 * ecosystem strip shows beside it (that one is the server's).
 */
import type { NodeKind, RunMap } from '@/lib/adventure/play/runMap';
import type { RelicId } from '@/lib/adventure/play/relics';

export type LedgerKey =
  | 'nodes' | 'enemies' | 'elites' | 'boss' | 'words'
  | 'bestWord' | 'treasure' | 'events' | 'gold' | 'relics' | 'flawless';

/**
 * `climb` is the SPINE of the payout sheet — the five rows every run is scored
 * on, printed even at nought (the bar prints `Beyond Elites Killed (0)  0`), so
 * the score reads as the sum of a fixed sheet instead of whatever happened to be
 * non-zero. `bonus` rows are earned extras and only appear when they paid.
 */
export type LedgerGroup = 'climb' | 'bonus';

export interface LedgerLine {
  key: LedgerKey;
  group: LedgerGroup;
  /** What the line counts (nodes, kills, words, coins, the best word's board value). */
  count: number;
  /** Points per unit, or null when the points are not a product (best word, gold, flawless). */
  per: number | null;
  points: number;
  /** `bestWord` only — the word itself, so the row can print it. */
  word?: string;
}

export interface RunLedgerResult {
  /** Every printed row, spine first — `[...spine, ...bonus]`. */
  lines: LedgerLine[];
  /** Left column: the five always-printed climb rows. */
  spine: LedgerLine[];
  /** Right column: the extras this run actually earned. */
  bonus: LedgerLine[];
  total: number;
}

/** Point values. Exported so the test states the arithmetic instead of copying it. */
export const LEDGER_PER = {
  nodes: 5,
  enemies: 10,
  elites: 25,
  boss: 50,
  words: 2,
  relics: 8,
  /**
   * A chest opened on the way up. Its coins ALSO pay on the gold row — the same
   * deliberate double count the bar makes with Floors Climbed + Money Money: one
   * row pays for the detour, the other for what the purse ended at.
   */
  treasure: 15,
  /** An unknown braved rather than routed around. */
  events: 10,
  /** Gold pays 1 point per this many coins — a full purse is a good run, not the whole score. */
  goldPer: 5,
  /** Cleared the act without losing a single heart. */
  flawless: 50,
} as const;

/** Fixed reading order: the spine, then the earned extras. */
const SPINE: LedgerKey[] = ['nodes', 'enemies', 'elites', 'boss', 'words'];
const BONUS: LedgerKey[] = ['bestWord', 'treasure', 'events', 'gold', 'relics', 'flawless'];

/** The kind of every node id in `path`, in order. Unknown ids and a missing map drop out. */
export function walkedKinds(map: RunMap | null | undefined, path: readonly string[]): NodeKind[] {
  if (!map) return [];
  const byId = new Map(map.nodes.map((n) => [n.id, n.kind]));
  const out: NodeKind[] = [];
  for (const id of path ?? []) {
    const kind = byId.get(id);
    if (kind) out.push(kind);
  }
  return out;
}

export interface LedgerInput {
  map: RunMap | null | undefined;
  /** Node ids the run entered, in order — the LAST one is the node just played. */
  path: readonly string[];
  won: boolean;
  /** Words found across the whole run. */
  words: number;
  bestWord: { word: string; pts: number } | null;
  gold: number;
  relics: readonly RelicId[];
  hp: number;
  maxHp: number;
}

/** Only a finite, positive integer scores; junk on the wire scores nothing. */
const count = (n: unknown): number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;

export function runLedger(input: LedgerInput): RunLedgerResult {
  const walked = walkedKinds(input.map, input.path);
  // A run only ever loses on the node it is standing on, so a loss credits
  // everything before it and nothing for it.
  const cleared = input.won ? walked : walked.slice(0, -1);
  const kills = (kind: NodeKind) => cleared.filter((k) => k === kind).length;

  const maxHp = count(input.maxHp);
  const hp = count(input.hp);
  const flawless = input.won && maxHp > 0 && hp >= maxHp;
  const best = input.bestWord;
  const bestPts = count(best?.pts);
  const gold = count(input.gold);

  const raw: Record<LedgerKey, LedgerLine> = {
    nodes: mul('nodes', 'climb', cleared.length, LEDGER_PER.nodes),
    enemies: mul('enemies', 'climb', kills('fight'), LEDGER_PER.enemies),
    elites: mul('elites', 'climb', kills('elite'), LEDGER_PER.elites),
    boss: mul('boss', 'climb', kills('boss'), LEDGER_PER.boss),
    words: mul('words', 'climb', count(input.words), LEDGER_PER.words),
    bestWord: { key: 'bestWord', group: 'bonus', count: bestPts, per: null, points: bestPts, word: best?.word },
    treasure: mul('treasure', 'bonus', kills('treasure'), LEDGER_PER.treasure),
    events: mul('events', 'bonus', kills('event'), LEDGER_PER.events),
    gold: { key: 'gold', group: 'bonus', count: gold, per: null, points: Math.floor(gold / LEDGER_PER.goldPer) },
    relics: mul('relics', 'bonus', count(input.relics?.length), LEDGER_PER.relics),
    flawless: { key: 'flawless', group: 'bonus', count: flawless ? 1 : 0, per: null, points: flawless ? LEDGER_PER.flawless : 0 },
  };

  // The spine is always printed — a nought on it is information ("no elite on
  // this path"), not noise. An unearned BONUS is left off: a column of empty
  // extras would read as a list of things the run failed at.
  const spine = SPINE.map((k) => raw[k]);
  const bonus = BONUS.map((k) => raw[k]).filter((l) => l.points > 0);
  const lines = [...spine, ...bonus];
  return { lines, spine, bonus, total: lines.reduce((n, l) => n + l.points, 0) };
}

function mul(key: LedgerKey, group: LedgerGroup, n: number, per: number): LedgerLine {
  const c = count(n);
  return { key, group, count: c, per, points: c * per };
}
