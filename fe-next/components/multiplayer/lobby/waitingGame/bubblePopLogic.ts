import { pick, type Rand } from '@/lib/animation/variety';

export type BubbleKind = 'bubble' | 'star';
export type BubbleTone = 'pink' | 'cyan' | 'lime' | 'purple';

export interface Bubble {
  id: number;
  /** Horizontal centre, % of the arena width. */
  x: number;
  size: number;
  riseMs: number;
  kind: BubbleKind;
  tone: BubbleTone;
}

export interface PopState {
  score: number;
  combo: number;
  lastPopAt: number | null;
}

export const ROUND_MS = 20_000;
export const COMBO_WINDOW_MS = 900;
export const MAX_COMBO = 5;
export const START: PopState = { score: 0, combo: 0, lastPopAt: null };

const TONES: readonly BubbleTone[] = ['pink', 'cyan', 'lime', 'purple'];
const BEST_KEY = 'lexiclash.lobbyBubbleBest';

export function scorePop(s: PopState, kind: BubbleKind, now: number): PopState {
  const chained = s.lastPopAt !== null && now - s.lastPopAt <= COMBO_WINDOW_MS;
  const combo = chained ? Math.min(MAX_COMBO, s.combo + 1) : 1;
  return { score: s.score + (kind === 'star' ? 5 : 1) * combo, combo, lastPopAt: now };
}

export const missBubble = (s: PopState): PopState => ({ score: s.score, combo: 0, lastPopAt: null });

export function makeBubble(id: number, rand: Rand = Math.random): Bubble {
  const star = rand() < 0.08;
  return {
    id,
    x: 10 + rand() * 80,
    size: star ? 48 : 44 + Math.round(rand() * 18),
    riseMs: 3200 + Math.round(rand() * 1400),
    kind: star ? 'star' : 'bubble',
    tone: pick(TONES, rand),
  };
}

/** Bubbles come quicker as the round runs out. */
export const spawnDelay = (elapsedMs: number): number => Math.round(650 - 280 * Math.min(1, elapsedMs / ROUND_MS));

export function readBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Saves `score` when it beats the stored best; true when it did. */
export function writeBest(score: number): boolean {
  if (score <= readBest()) return false;
  try {
    localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // Private mode: the best just lasts this session.
  }
  return true;
}
