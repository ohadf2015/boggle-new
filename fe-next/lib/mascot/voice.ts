import type { MascotState } from '@/lib/blast/mascotState';
import type { MascotGagSound } from './gagSounds';

export type MascotVoiceSound =
  | 'mascotCheer'
  | 'mascotGiggle'
  | 'mascotGasp'
  | 'mascotWhoa'
  | 'mascotAww'
  | 'mascotDrumroll';

export type MascotSound = MascotVoiceSound | MascotGagSound;

export interface MascotVoice {
  sound: MascotSound;
  rate: number;
}

export const VOICE_CHANCE = 1 / 3;

/** The mascot's own cry, saved for big moments so players learn it. */
export const SIGNATURE_CRY: MascotVoice = { sound: 'gagMascotCry', rate: 1 };

const LINES: Partial<Record<MascotState, MascotVoiceSound>> = {
  cheer: 'mascotCheer',
  wow: 'mascotCheer',
  proud: 'mascotCheer',
  awe: 'mascotWhoa',
  oh: 'mascotGasp',
  nervous: 'mascotGasp',
  dancing: 'mascotGiggle',
  unhinged: 'mascotGiggle',
  'sad-supportive': 'mascotAww',
  exhausted: 'mascotAww',
};

const BIG_MOMENTS: ReadonlySet<MascotState> = new Set(['awe', 'unhinged']);

export function voiceLineFor(state: MascotState): MascotVoiceSound | null {
  return LINES[state] ?? null;
}

export function isBigMoment(state: MascotState): boolean {
  return BIG_MOMENTS.has(state);
}

export interface VoiceHistory {
  lastVoiced: boolean;
}

export function createVoiceHistory(): VoiceHistory {
  return { lastVoiced: false };
}

export function pickVoice(
  state: MascotState,
  history: VoiceHistory,
  rng: () => number,
): { voice: MascotVoice | null; history: VoiceHistory } {
  const line = voiceLineFor(state);
  const silent = { voice: null, history: { lastVoiced: false } };
  if (!line || history.lastVoiced) return silent;
  if (isBigMoment(state)) return { voice: SIGNATURE_CRY, history: { lastVoiced: true } };
  if (rng() >= VOICE_CHANCE) return silent;
  return { voice: { sound: line, rate: 1 }, history: { lastVoiced: true } };
}
