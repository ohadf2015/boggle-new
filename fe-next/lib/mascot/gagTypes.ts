import type { MascotEvent } from '@/lib/blast/mascotState';
import type { MascotSound } from './voice';

export type BeatPhase = 'windup' | 'action' | 'freeze' | 'reaction';

export type PropKind =
  | 'tile' | 'tile-stack' | 'stamp' | 'book' | 'photo' | 'trophy' | 'dust' | 'cheat-sheet' | 'tape' | 'tape-double' | 'score-sheet';
export type PropMove = 'enter' | 'hold' | 'flip' | 'close' | 'fall' | 'drop' | 'exit' | 'zip-out' | 'snap' | 'crumple';

export interface GagBeat {
  phase: BeatPhase;
  pose: string;
  ms: number;
  /** px pushed out past the screen edge: 0 = fully in view, 80 = hidden. */
  out: number;
  y: number;
  rotate: number;
  scaleX: number;
  scaleY: number;
  prop?: { kind: PropKind; move: PropMove };
  cry?: boolean;
  sound?: MascotSound;
  soundRate?: number;
}

export interface GagVariant {
  id: string;
  /** Id in public/mascot/anim/manifest.json; the pose beats are the fallback. */
  clip?: string;
  clipSrc?: string;
  beats: GagBeat[];
}

/** Events the director hears: bus events plus the two the host derives itself. */
export type GagEvent =
  | MascotEvent
  | { kind: 'idle' }
  | { kind: 'session-start'; daysAway: number | null };

export interface GagContext {
  rejectionsThisRound: number;
  wordsThisRound: number;
}

export interface GagDef {
  id: string;
  /** Number in docs/research/mascot-comedy-bible.md. */
  bible: number;
  matches: (event: GagEvent, ctx: GagContext) => boolean;
  /** Share of eligible events that fire it (bible rule 10: ~1 in 5 for big gags). */
  chance: number;
  variants: GagVariant[];
  /** Play variants in order, one per occurrence, then retire (bible rule 9). */
  running?: boolean;
  /** At most once per calendar day. */
  daily?: boolean;
  /** Last beat holds until the next word, or until the round ends. */
  holdUntil?: 'word' | 'round-end';
  /** A real one-off moment that may follow another gag closely. */
  ignoresGap?: boolean;
  /** Running-gag stages restart every play session instead of retiring for good. */
  perSession?: boolean;
  /** Eligible only once this gag has played in the current session (a callback). */
  after?: string;
  /** Daily gags in one group share a single daily slot and take turns across days. */
  dailyGroup?: string;
  /** Plays against a host element instead of the gag stage; the host passes it in. */
  anchor?: 'timer';
  /** Cuts a playing gag short and skips the round and session caps. */
  interrupts?: boolean;
}
