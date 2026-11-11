import type { ResultsMode } from '@/lib/rivals/types';

export interface RunRecord {
  mode: ResultsMode;
  value: number;
  previous: number;
}

export interface PublishRunRecordInput {
  mode: ResultsMode;
  value: number;
  /** The best captured BEFORE this run wrote its own result; null when there was none. */
  previous: number | null | undefined;
}

interface LedgerEntry {
  best: number;
  previous?: number;
}

type Ledger = Partial<Record<ResultsMode, LedgerEntry>>;

const LEDGER_KEY = 'lexiclash_record_ledger_v1';

/** Modes whose results already know their pre-run best and publish it; they never use the ledger. */
export const PUBLISHING_MODES: ReadonlySet<ResultsMode> = new Set<ResultsMode>(['quickPlay', 'blast', 'single', 'tower']);

const published = new Map<ResultsMode, RunRecord>();
const evaluated = new Map<string, RunRecord | null>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function publishRunRecord({ mode, value, previous }: PublishRunRecordInput): RunRecord | null {
  const beaten = typeof previous === 'number' && previous > 0 && value > previous;
  if (!beaten) {
    published.delete(mode);
    notify();
    return null;
  }
  const record: RunRecord = { mode, value, previous: previous as number };
  published.set(mode, record);
  bumpLedger(mode, value, previous as number);
  notify();
  return record;
}

export function getRunRecord(mode: ResultsMode): RunRecord | null {
  return published.get(mode) ?? null;
}

export function subscribeRunRecords(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function readRecordLedger(): Ledger {
  try {
    const raw = localStorage.getItem(LEDGER_KEY);
    return raw ? (JSON.parse(raw) as Ledger) : {};
  } catch {
    return {};
  }
}

function writeLedger(ledger: Ledger) {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger));
  } catch {
    /* storage blocked: records just won't persist */
  }
}

function bumpLedger(mode: ResultsMode, value: number, previous?: number) {
  const ledger = readRecordLedger();
  const cur = ledger[mode];
  if (cur && cur.best >= value) return;
  ledger[mode] = previous !== undefined ? { best: value, previous } : { best: value };
  writeLedger(ledger);
}

/**
 * For modes with no stored best of their own: compare against the last best this
 * device saw. Memoised per run so a remounted results screen keeps its banner.
 */
export function evaluateAgainstLedger(mode: ResultsMode, score: number): RunRecord | null {
  if (typeof window === 'undefined') return null;
  const memoKey = `${mode}:${score}`;
  if (evaluated.has(memoKey)) return evaluated.get(memoKey) ?? null;
  const prior = readRecordLedger()[mode];
  let result: RunRecord | null = null;
  if (!prior || prior.best <= 0) {
    bumpLedger(mode, score);
  } else if (score > prior.best) {
    result = { mode, value: score, previous: prior.best };
    bumpLedger(mode, score, prior.best);
  }
  evaluated.set(memoKey, result);
  return result;
}

export function __resetRunRecordsForTests() {
  published.clear();
  evaluated.clear();
  listeners.clear();
}
