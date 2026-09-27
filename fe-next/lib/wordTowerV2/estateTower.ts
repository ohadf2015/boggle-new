/**
 * `last_tower`: the compact block list stored on an estate so a rival can
 * render (and wreck) the ACTUAL building. It is read back from jsonb or
 * localStorage, so decoding treats it as untrusted: clamped numbers, words
 * stripped of control/bidi characters (same rule as a shared rival link).
 */
import { cleanUntrustedText } from './sanitizeText';

export interface TowerBlock {
  word: string;
  /** Block width, px (engine space). */
  w: number;
  /** Centre x, px; 0 = tower axis. */
  x: number;
  /** Centre y, px; ground is 0, up is negative. */
  y: number;
  /** Radians. */
  angle: number;
  /** 0xRRGGBB. */
  color: number;
}

/** Stored as tuples: [word, w, x, y, angle, color] — about a third of the jsonb of objects. */
export type EncodedBlock = [string, number, number, number, number, number];

export const MAX_TOWER_BLOCKS = 60;
const MAX_WORD = 15;

const num = (v: unknown, lo: number, hi: number, fallback = 0): number => {
  const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return Math.min(hi, Math.max(lo, n));
};

function toBlock(raw: unknown): TowerBlock | null {
  let parts: unknown[];
  if (Array.isArray(raw)) parts = raw;
  else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    parts = [o.word, o.w, o.x, o.y, o.angle, o.color];
  } else return null;
  const [word, w, x, y, angle, color] = parts;
  if (typeof word !== 'string') return null;
  const clean = cleanUntrustedText(word, MAX_WORD);
  if (!clean) return null;
  const c = typeof color === 'number' && Number.isInteger(color) && color >= 0 && color <= 0xffffff ? color : 0;
  return {
    word: clean,
    w: Math.round(num(w, 20, 2000, 200)),
    x: Math.round(num(x, -3000, 3000)),
    y: Math.round(num(y, -20000, 200)),
    angle: Math.trunc(num(angle, -Math.PI, Math.PI) * 1000) / 1000,
    color: c,
  };
}

/** Lowest floors first; anything above MAX_TOWER_BLOCKS is dropped. */
export function encodeTower(blocks: TowerBlock[]): EncodedBlock[] {
  const out: EncodedBlock[] = [];
  for (const b of blocks) {
    const s = toBlock(b);
    if (s) out.push([s.word, s.w, s.x, s.y, s.angle, s.color]);
    if (out.length >= MAX_TOWER_BLOCKS) break;
  }
  return out;
}

export function decodeTower(raw: unknown): TowerBlock[] {
  if (!Array.isArray(raw)) return [];
  const out: TowerBlock[] = [];
  for (const r of raw) {
    const b = toBlock(r);
    if (b) out.push(b);
    if (out.length >= MAX_TOWER_BLOCKS) break;
  }
  return out;
}
