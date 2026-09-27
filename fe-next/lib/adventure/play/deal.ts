/**
 * Level dealer — board + hunt targets + hint pool. Pure: the route injects the
 * generator, solver and dictionary so this stays unit-testable and never pulls
 * the backend dictionary module (not loaded inside the Next route process).
 */
import { isWordOnBoard, normalizeWord } from '@/utils/clientWordValidator';
import { applyHebrewFinalLetters } from '@/shared/utils/wordNormalization';
import type { PlayLevel } from './levels';

/** Dictionary shape the solver needs: exact membership + prefix pruning. */
export interface PrefixDict {
  has(word: string): boolean;
  hasPrefix(prefix: string): boolean;
}

/** Build a PrefixDict over a word list (sorted copy; strings are shared, not copied). */
export function sortedDict(words: Iterable<string>): PrefixDict {
  const arr = Array.from(words).sort();
  const lowerBound = (p: string) => {
    let lo = 0;
    let hi = arr.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (arr[mid] < p) lo = mid + 1; else hi = mid;
    }
    return lo;
  };
  return {
    has: (w) => arr[lowerBound(w)] === w,
    hasPrefix: (p) => {
      const i = lowerBound(p);
      return i < arr.length && arr[i].startsWith(p);
    },
  };
}

/** Trie-free DFS with prefix pruning. Returns lowercase words (like findAllWords). */
export function solveBoard(grid: string[][], dict: PrefixDict, { minLength = 3, maxLength = 10, maxWords = 400 } = {}): string[] {
  const board = grid.map((r) => r.map((c) => String(c).toLowerCase()));
  const rows = board.length;
  const cols = board[0]?.length ?? 0;
  const found = new Set<string>();
  const seen = new Uint8Array(rows * cols);

  const dfs = (r: number, c: number, word: string) => {
    if (found.size >= maxWords) return;
    const len = Array.from(word).length;
    if (len >= minLength && dict.has(word)) found.add(word);
    if (len >= maxLength) return;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const nr = r + dr;
      const nc = c + dc;
      if ((dr || dc) && nr >= 0 && nr < rows && nc >= 0 && nc < cols && !seen[nr * cols + nc]) {
        const next = word + board[nr][nc];
        if (!dict.hasPrefix(next)) continue;
        seen[nr * cols + nc] = 1;
        dfs(nr, nc, next);
        seen[nr * cols + nc] = 0;
      }
    }
  };
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (!dict.hasPrefix(board[r][c])) continue;
    seen[r * cols + c] = 1;
    dfs(r, c, board[r][c]);
    seen[r * cols + c] = 0;
  }
  return [...found];
}

/** Up to `max` hint words, shortest-first, round-robin across lengths so the pool mixes. */
export function pickHints(words: readonly string[], max = 12): string[] {
  const byLen = new Map<number, string[]>();
  for (const w of [...new Set(words)].sort()) {
    const n = Array.from(w).length;
    byLen.set(n, [...(byLen.get(n) ?? []), w]);
  }
  const buckets = [...byLen.keys()].sort((a, b) => a - b).map((k) => byLen.get(k)!);
  const out: string[] = [];
  while (out.length < max && buckets.some((b) => b.length)) {
    for (const b of buckets) if (b.length && out.length < max) out.push(b.shift()!);
  }
  return out;
}

/** `n` distinct 4-6 letter targets, seeded pick. */
export function pickTargets(words: readonly string[], n: number, rand: () => number): string[] {
  const pool = [...new Set(words)].filter((w) => { const l = Array.from(w).length; return l >= 4 && l <= 6; }).sort();
  const out: string[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}

export interface DealInput {
  lvl: PlayLevel;
  language: string;
  isWord: (w: string) => boolean;
  rand: () => number;
  /** Board generator; receives words to embed (teacher targets, or common hunt picks). */
  generate: (targetWords?: string[]) => string[][];
  /** All dictionary words on a board (lowercase). */
  solve: (grid: string[][]) => string[];
  /** Teacher hook: words the hunt must use. Default = pick from what the solver finds. */
  targetWords?: string[];
  /**
   * Everyday words for this language (e.g. backend/common_hunt_words*.txt). Hints and
   * hunt targets prefer them so the game never "hints" feese/naoi/eyas. Optional and
   * degrading: a thin list (ru has ~180 words) falls back to any real word.
   */
  common?: readonly string[];
}

export interface Deal { grid: string[][]; hints: string[]; targets?: string[] }

const MAX_DEALS = 8;

/** How a stored (board-form) target is shown: Hebrew gets its final letter form back. */
export function displayTarget(word: string, language: string): string {
  return language === 'he' ? applyHebrewFinalLetters(word) : word;
}

const len = (w: string) => Array.from(w).length;

/** `n` distinct seeded picks from `pool`. */
function sample(pool: readonly string[], n: number, rand: () => number): string[] {
  const left = [...new Set(pool)].sort();
  const out: string[] = [];
  while (out.length < n && left.length) out.push(left.splice(Math.floor(rand() * left.length), 1)[0]);
  return out;
}

export function dealLevel({ lvl, language, isWord, rand, generate, solve, targetWords, common }: DealInput): Deal {
  const need = lvl.kind === 'hunt' ? (lvl.huntCount ?? 2) + 1 : 0;
  const teacher = targetWords?.map((w) => w.toLowerCase().trim()).filter(Boolean);
  const commonSet = new Set((common ?? []).map((w) => normalizeWord(w.toLowerCase().trim(), language)).filter(Boolean));
  const isCommon = (w: string) => commonSet.has(w);
  // Hunt words the board can actually hold: 4-5 letters on 4x4, up to 6 on bigger boards.
  const maxTarget = lvl.size <= 4 ? 5 : 6;
  const embedPool = [...commonSet].filter((w) => len(w) >= Math.max(4, lvl.minLength) && len(w) <= maxTarget);
  let fallback: Deal | null = null;

  for (let i = 0; i < MAX_DEALS; i++) {
    // First half of the hunt deals: ask the generator to plant common words.
    const embed = teacher?.length ? teacher
      : need && embedPool.length && i < MAX_DEALS / 2 ? sample(embedPool, need, rand) : undefined;
    const grid = generate(embed);
    const board = grid.map((r) => r.map((c) => c.toLowerCase()));
    const playable = (w: string) => len(w) >= lvl.minLength && isWordOnBoard(w, board, language) && isWord(w);
    const words = [...new Set(solve(grid))].filter(playable);
    const everyday = words.filter(isCommon);
    const hints = [...pickHints(everyday, 12), ...pickHints(words.filter((w) => !isCommon(w)), 12)].slice(0, 12);
    if (!need) return { grid, hints };
    if (teacher?.length) {
      const targets = teacher.filter((w) => isWordOnBoard(w, board, language));
      // Never issue a hunt with fewer targets than it takes to win.
      if (targets.length >= Math.max(need - 1, Math.min(need, teacher.length))) return { grid, hints, targets };
      continue;
    }
    const picked = pickTargets(everyday, need, rand);
    if (picked.length >= need) return { grid, hints, targets: picked };
    // Not enough everyday words on this board: remember a real-word fill in case no board does better.
    if (!fallback) {
      const fill = pickTargets(words.filter((w) => !picked.includes(w)), need - picked.length, rand);
      if (picked.length + fill.length >= need) fallback = { grid, hints, targets: [...picked, ...fill] };
    }
  }
  if (fallback) return fallback;
  throw new Error(`hunt deal failed: could not place ${need} targets for w${lvl.world}-l${lvl.level}`);
}
