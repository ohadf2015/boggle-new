import type { MascotEvent } from '@/lib/blast/mascotState';
import type { MascotVoiceSound } from './voice';

export type BeatPhase = 'windup' | 'action' | 'freeze' | 'reaction';

export type PropKind = 'tile' | 'tile-stack' | 'stamp' | 'book' | 'photo' | 'trophy' | 'dust' | 'cheat-sheet';
export type PropMove = 'enter' | 'hold' | 'flip' | 'close' | 'fall' | 'drop' | 'exit';

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
  sound?: MascotVoiceSound;
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
}
