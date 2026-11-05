/**
 * Russian word membership without a 1.4M-entry Set in the heap.
 *
 * backend/russian_words.txt is lowercase and byte-sorted (LC_ALL=C), so it is
 * kept as ONE Buffer (~30MB) and binary-searched. A Set of the same words would
 * be several times larger — the Next process has a 1536MB heap cap
 * (see lib/server/sharedWordSets.ts, OOM 2026-08-06).
 */
import * as fs from 'fs';
import * as path from 'path';

let buf: Buffer | null = null;
let lineStarts: Uint32Array | null = null;

function load() {
  if (buf) return;
  const file = path.join(process.cwd(), 'backend', 'russian_words.txt');
  buf = fs.existsSync(file) ? fs.readFileSync(file) : Buffer.alloc(0);
  let count = buf.length ? 1 : 0;
  for (let i = 0; i + 1 < buf.length; i++) if (buf[i] === 10) count++;
  lineStarts = new Uint32Array(count);
  for (let i = 0, line = 1; i + 1 < buf.length; i++) if (buf[i] === 10) lineStarts[line++] = i + 1;
}

function lineAt(i: number): Buffer {
  const start = lineStarts![i];
  let end = i + 1 < lineStarts!.length ? lineStarts![i + 1] - 1 : buf!.length;
  while (end > start && (buf![end - 1] === 10 || buf![end - 1] === 13)) end--;
  return buf!.subarray(start, end);
}

function has(word: string): boolean {
  const needle = Buffer.from(word, 'utf8');
  let lo = 0;
  let hi = lineStarts!.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const c = Buffer.compare(lineAt(mid), needle);
    if (c === 0) return true;
    if (c < 0) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}

/** Boards and players may write е where the list has ё, so try each е as ё (capped). */
export function isRussianWord(raw: string): boolean {
  const word = (raw ?? '').trim().toLowerCase();
  if (!word || !/^[а-яё]+$/.test(word)) return false;
  load();
  if (!lineStarts!.length) return false;
  if (has(word)) return true;
  const es = [...word].map((ch, i) => (ch === 'е' ? i : -1)).filter((i) => i >= 0).slice(0, 4);
  for (let mask = 1; mask < 1 << es.length; mask++) {
    const chars = [...word];
    es.forEach((pos, b) => { if (mask & (1 << b)) chars[pos] = 'ё'; });
    if (has(chars.join(''))) return true;
  }
  return false;
}

/** True when some list word starts with `prefix` (lower-bound binary search; used by board solvers). */
export function hasRussianPrefix(prefix: string): boolean {
  if (!prefix) return false;
  load();
  const n = lineStarts!.length;
  if (!n) return false;
  const needle = Buffer.from(prefix, 'utf8');
  let lo = 0;
  let hi = n;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (Buffer.compare(lineAt(mid), needle) < 0) lo = mid + 1; else hi = mid;
  }
  if (lo >= n) return false;
  const line = lineAt(lo);
  return line.length >= needle.length && line.subarray(0, needle.length).equals(needle);
}

export interface RussianWordQuery {
  /** Letters to draw from (а-я, ё folded to е); rack and blanks both empty = no limit. */
  rack: string;
  blanks: number;
  /** One entry per position: a fixed letter, or null for an open slot that draws on the rack. */
  pattern: (string | null)[] | null;
  startsWith: string;
  endsWith: string;
  contains: string;
  length: number | null;
}

const YO_FOLDED_SLOT = 5;
const OPEN_SLOT = -1;

function slotAt(b: Buffer, i: number): number {
  if (b[i] === 0xd0) return b[i + 1] - 0xb0;
  return b[i + 1] === 0x91 ? YO_FOLDED_SLOT : b[i + 1] - 0x70;
}

function toSlots(text: string): Uint8Array {
  const bytes = Buffer.from(text, 'utf8');
  const slots = new Uint8Array(bytes.length >> 1);
  for (let i = 0; i < slots.length; i++) slots[i] = slotAt(bytes, i * 2);
  return slots;
}

function slotsMatchAt(b: Buffer, at: number, slots: Uint8Array): boolean {
  for (let i = 0; i < slots.length; i++) if (slotAt(b, at + i * 2) !== slots[i]) return false;
  return true;
}

function containsSlots(b: Buffer, start: number, end: number, slots: Uint8Array): boolean {
  for (let at = start; at + slots.length * 2 <= end; at += 2) if (slotsMatchAt(b, at, slots)) return true;
  return false;
}

function fitsLetters(
  b: Buffer, start: number, end: number,
  fixed: Int8Array | null, available: Uint8Array, used: Uint8Array, blanks: number,
): boolean {
  let missing = 0;
  let i = start;
  let fits = true;
  for (; i < end; i += 2) {
    const slot = slotAt(b, i);
    if (fixed !== null && fixed[(i - start) >> 1] !== OPEN_SLOT) {
      if (fixed[(i - start) >> 1] !== slot) { fits = false; break; }
    } else if (used[slot] < available[slot]) used[slot]++;
    else if (missing === blanks) { fits = false; break; }
    else missing++;
  }
  for (let j = start; j < i; j += 2) used[slotAt(b, j)] = 0;
  return fits;
}

/** Matches on raw bytes (every letter is two) so a request allocates no per-word strings; mirrors buildMatcher. */
export function scanRussianWords(query: RussianWordQuery, visit: (start: number, letters: number) => void): void {
  load();
  const b = buf!;
  const starts = lineStarts!;
  const n = starts.length;
  if (!n) return;

  // Reading past the last word's end makes V8 deoptimize this loop about tenfold.
  let fileEnd = b.length;
  while (fileEnd > 0 && (b[fileEnd - 1] === 10 || b[fileEnd - 1] === 13)) fileEnd--;

  const { rack, pattern, length } = query;
  const available = new Uint8Array(32);
  for (const slot of toSlots(rack)) available[slot]++;
  const used = new Uint8Array(32);
  const blanks = rack.length + query.blanks > 0 ? query.blanks : Infinity;
  const maxLetters = pattern || blanks === Infinity ? Infinity : rack.length + blanks;
  const prefix = toSlots(query.startsWith);
  const suffix = toSlots(query.endsWith);
  const inner = toSlots(query.contains);
  const fixed = pattern ? Int8Array.from(pattern, (ch) => (ch === null ? OPEN_SLOT : toSlots(ch)[0])) : null;

  for (let w = 0; w < n; w++) {
    const start = starts[w];
    const end = w + 1 < n ? starts[w + 1] - 1 : fileEnd;
    const letters = (end - start) >> 1;
    if (letters < 2 || letters > maxLetters) continue;
    if (length !== null && letters !== length) continue;
    if (pattern && letters !== pattern.length) continue;
    if (letters < prefix.length || letters < suffix.length) continue;
    if (prefix.length && !slotsMatchAt(b, start, prefix)) continue;
    if (suffix.length && !slotsMatchAt(b, end - suffix.length * 2, suffix)) continue;
    if (inner.length && !containsSlots(b, start, end, inner)) continue;
    if (!fitsLetters(b, start, end, fixed, available, used, blanks)) continue;
    visit(start, letters);
  }
}

export function readRussianWord(start: number, letters: number): string {
  return buf!.toString('utf8', start, start + letters * 2);
}
