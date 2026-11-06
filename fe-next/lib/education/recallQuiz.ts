import type { StudyCard } from '@/shared/utils/studyCards';

/** Recalling a word from its meaning beats re-reading it; a missed word comes back after a short gap, not straight away. */

export type Rng = () => number;

export interface RecallItem {
  word: string;
  definition: string;
}

export interface RecallQuestion extends RecallItem {
  options: string[];
}

export interface RecallResult extends RecallItem {
  correct: boolean;
  choice: string;
}

export interface RecallState {
  items: Record<string, RecallItem>;
  pool: string[];
  target: number;
  queue: string[];
  counts: Record<string, number>;
  question: RecallQuestion | null;
  streak: number;
  last: RecallResult | null;
}

const MAX_OPTIONS = 4;
const RETRY_GAP = 3;
const SMALL_DECK = 12;

const keyOf = (text: string) => text.trim().toLowerCase();

export function quizzableCards(cards: readonly StudyCard[]): RecallItem[] {
  const seen = new Set<string>();
  const out: RecallItem[] = [];
  for (const card of cards) {
    const definition = card.definition?.trim();
    const key = keyOf(card.word);
    if (!definition || !key || seen.has(key)) continue;
    seen.add(key);
    out.push({ word: card.word.trim(), definition });
  }
  return out;
}

export function recallTarget(count: number): number {
  return count <= SMALL_DECK ? 2 : 1;
}

function shuffle<T>(list: readonly T[], rng: Rng): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function ask(state: Omit<RecallState, 'question'>, rng: Rng): RecallQuestion | null {
  const key = state.queue[0];
  if (!key) return null;
  const item = state.items[key];
  const sameMeaning = keyOf(item.definition);
  const distractors = state.pool.filter((word) => {
    const k = keyOf(word);
    return k !== key && (!state.items[k] || keyOf(state.items[k].definition) !== sameMeaning);
  });
  const picked = shuffle(distractors, rng).slice(0, MAX_OPTIONS - 1);
  return { ...item, options: shuffle([item.word, ...picked], rng) };
}

export function startRecall(items: readonly RecallItem[], opts: { pool: readonly string[]; target: number; rng: Rng }): RecallState {
  const byKey: Record<string, RecallItem> = {};
  for (const item of items) byKey[keyOf(item.word)] ??= item;
  const seen = new Set<string>();
  const pool = [...opts.pool, ...items.map((i) => i.word)].filter((word) => {
    const k = keyOf(word);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const base = {
    items: byKey,
    pool,
    target: Math.max(1, opts.target),
    queue: shuffle(Object.keys(byKey), opts.rng),
    counts: {},
    streak: 0,
    last: null,
  };
  return { ...base, question: ask(base, opts.rng) };
}

export function answerRecall(state: RecallState, choice: string, rng: Rng): RecallState {
  const question = state.question;
  if (!question) return state;
  const [key, ...rest] = state.queue;
  const correct = keyOf(choice) === key;
  const counts = correct ? { ...state.counts, [key]: (state.counts[key] ?? 0) + 1 } : state.counts;
  let queue = rest;
  if (!correct) queue = [...rest.slice(0, RETRY_GAP), key, ...rest.slice(RETRY_GAP)];
  else if (counts[key] < state.target) queue = [...rest, key];
  const next = {
    ...state,
    queue,
    counts,
    streak: correct ? state.streak + 1 : 0,
    last: { word: question.word, definition: question.definition, correct, choice },
  };
  return { ...next, question: ask(next, rng) };
}

export function masteredCount(state: RecallState): number {
  return Object.keys(state.items).filter((k) => (state.counts[k] ?? 0) >= state.target).length;
}

export function isRecallFinished(state: RecallState): boolean {
  return state.queue.length === 0;
}
