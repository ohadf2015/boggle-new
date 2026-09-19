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
  const starts: number[] = buf.length ? [0] : [];
  for (let i = 0; i < buf.length; i++) if (buf[i] === 10 && i + 1 < buf.length) starts.push(i + 1);
  lineStarts = Uint32Array.from(starts);
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
