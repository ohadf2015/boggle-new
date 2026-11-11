import type { MascotEvent } from '@/lib/blast/mascotState';
import { HapticPattern } from '@/utils/haptics/types';
import { milestoneFor } from './rewards';

export interface FeelSnapshot {
  floors: number;
  combo: number;
  over: boolean;
  collapsed: boolean;
  risk: number;
}

export type FeelCue = { mascot: MascotEvent } | { haptic: HapticPattern };

const DANGER_RISK = 0.7;

/** What the mascot and the phone react to between two frames of a run. */
export function feelCues(prev: FeelSnapshot, next: FeelSnapshot, lastWordLength: number): FeelCue[] {
  const cues: FeelCue[] = [];
  if (!prev.over && next.over) {
    if (next.collapsed) cues.push({ mascot: { kind: 'wave-fail' } }, { haptic: HapticPattern.ERROR });
    else if (next.floors > 0) cues.push({ mascot: { kind: 'wave-clear' } }, { haptic: HapticPattern.SUCCESS });
    return cues;
  }
  if (next.over || next.floors < prev.floors) return cues;
  if (next.floors > prev.floors) {
    cues.push({ mascot: { kind: 'word-submitted', wordLength: lastWordLength, gemLetterUsed: false } });
    if (milestoneFor(prev.floors, next.floors) != null) cues.push({ mascot: { kind: 'wave-clear' } });
    cues.push({ haptic: next.combo > prev.combo ? HapticPattern.SUCCESS : HapticPattern.TAP });
  }
  if (prev.risk < DANGER_RISK && next.risk >= DANGER_RISK) {
    cues.push({ mascot: { kind: 'low-moves', movesRemaining: 1 } }, { haptic: HapticPattern.WARNING });
  }
  return cues;
}
