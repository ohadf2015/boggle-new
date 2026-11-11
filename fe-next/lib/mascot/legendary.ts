import type { MascotVoiceSound } from './voice';

export type BeatPhase = 'windup' | 'action' | 'freeze' | 'reaction';

export interface GagBeat {
  phase: BeatPhase;
  pose: string;
  ms: number;
  /** px pushed out past the screen edge: 0 = fully in view, 72 = hidden. */
  out: number;
  y: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  prop?: 'falling-block';
  cry?: boolean;
  sound?: MascotVoiceSound;
}

export type GagTrigger = { kind: 'word-count'; count: number } | { kind: 'long-word'; minLength: number };

export interface LegendaryGag {
  id: string;
  trigger: GagTrigger;
  beats: GagBeat[];
  /** Id in public/mascot/anim/manifest.json; the pose beats are the fallback. */
  clip?: string;
  /** Set once the clip is resolved from the manifest. */
  clipSrc?: string;
}

export const LEGENDARY_CHANCE = 0.01;

const P = {
  sneak: '/mascot/explorer-nobg.webp',
  shock: '/mascot/mindblown-nobg.webp',
  dizzy: '/mascot/bored-nobg.webp',
  hello: '/mascot/hello-nobg.webp',
  oops: '/mascot/bridge-oops-nobg.webp',
  run: '/mascot/onfire-nobg.webp',
  flop: '/mascot/sleepy-nobg.webp',
  tada: '/mascot/victory-nobg.webp',
  think: '/mascot/bridge-think-nobg.webp',
  cheer: '/mascot/bridge-cheer-nobg.webp',
  trophy: '/mascot/trophy-nobg.webp',
};

const still = { y: 0, rotate: 0, scaleX: 1, scaleY: 1 };

/** Placeholder content: gags are pure data, swap the list without touching the engine. */
export const LEGENDARY_GAGS: readonly LegendaryGag[] = [
  {
    id: 'bonk',
    clip: 'bonk-dizzy',
    trigger: { kind: 'word-count', count: 4 },
    beats: [
      { phase: 'windup', pose: P.sneak, ms: 520, out: 10, ...still, scaleY: 0.88, scaleX: 1.08 },
      { phase: 'action', pose: P.shock, ms: 160, out: 10, ...still, scaleY: 0.55, scaleX: 1.35, prop: 'falling-block', cry: true },
      { phase: 'freeze', pose: P.shock, ms: 420, out: 10, ...still, scaleY: 0.6, scaleX: 1.3, prop: 'falling-block' },
      { phase: 'reaction', pose: P.dizzy, ms: 700, out: 10, ...still, rotate: 720 },
      { phase: 'reaction', pose: P.dizzy, ms: 380, out: 80, ...still, rotate: 720 },
    ],
  },
  {
    id: 'glass-press',
    clip: 'glass-press',
    trigger: { kind: 'word-count', count: 6 },
    beats: [
      { phase: 'windup', pose: P.hello, ms: 480, out: 30, ...still, rotate: -8 },
      { phase: 'action', pose: P.hello, ms: 170, out: 0, ...still, scaleX: 0.55, scaleY: 1.25, cry: true },
      { phase: 'freeze', pose: P.shock, ms: 520, out: 0, ...still, scaleX: 0.6, scaleY: 1.2 },
      { phase: 'reaction', pose: P.oops, ms: 460, out: 80, ...still, rotate: 12 },
    ],
  },
  {
    id: 'faceplant',
    clip: 'faceplant-popup',
    trigger: { kind: 'word-count', count: 8 },
    beats: [
      { phase: 'windup', pose: P.run, ms: 450, out: 40, ...still, rotate: -12, scaleX: 0.92 },
      { phase: 'action', pose: P.run, ms: 180, out: 6, ...still, y: 14, rotate: 85, scaleY: 0.7, cry: true },
      { phase: 'freeze', pose: P.flop, ms: 480, out: 6, ...still, y: 14, rotate: 85, scaleY: 0.7 },
      { phase: 'reaction', pose: P.tada, ms: 420, out: 6, ...still, y: -10, scaleX: 1.15, scaleY: 1.2 },
      { phase: 'reaction', pose: P.tada, ms: 340, out: 80, ...still },
    ],
  },
  {
    id: 'photobomb',
    trigger: { kind: 'long-word', minLength: 7 },
    beats: [
      { phase: 'windup', pose: P.think, ms: 620, out: 44, ...still, y: 18, sound: 'mascotDrumroll' },
      { phase: 'action', pose: P.cheer, ms: 160, out: 0, ...still, y: -12, scaleX: 0.85, scaleY: 1.3, cry: true },
      { phase: 'freeze', pose: P.cheer, ms: 460, out: 0, ...still, y: -12, scaleX: 0.9, scaleY: 1.22 },
      { phase: 'reaction', pose: P.trophy, ms: 560, out: 80, ...still, rotate: 10 },
    ],
  },
];

export function gagDurationMs(gag: LegendaryGag): number {
  return gag.beats.reduce((sum, b) => sum + b.ms, 0);
}

/** Index of the beat playing at `elapsedMs`, or -1 once the gag is over. */
export function beatIndexAt(gag: LegendaryGag, elapsedMs: number): number {
  let end = 0;
  for (let i = 0; i < gag.beats.length; i++) {
    end += gag.beats[i].ms;
    if (elapsedMs < end) return i;
  }
  return -1;
}

export function rollLegendaryRound(
  rng: () => number,
  opts: { chance?: number; pool?: readonly LegendaryGag[]; lastGagId?: string | null } = {},
): LegendaryGag | null {
  const chance = opts.chance ?? LEGENDARY_CHANCE;
  const pool = opts.pool ?? LEGENDARY_GAGS;
  if (pool.length === 0 || rng() >= chance) return null;
  const fresh = pool.filter((g) => g.id !== opts.lastGagId);
  const choices = fresh.length > 0 ? fresh : pool;
  return choices[Math.floor(rng() * choices.length)];
}

export function shouldTriggerLegendary(
  gag: LegendaryGag,
  ctx: { wordsFound: number; wordLength: number },
): boolean {
  if (gag.trigger.kind === 'long-word') return ctx.wordLength >= gag.trigger.minLength;
  return ctx.wordsFound >= gag.trigger.count;
}
