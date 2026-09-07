/**
 * Classroom game presets — the teacher's one-tap rituals.
 *
 * A preset is a pure mapping onto the settings the setup wizard already
 * collects (timer, board, min word length) plus the new team-battle and
 * accessibility knobs. Keeping the mapping here — not inside components —
 * means the wizard, the dashboard heroes and the tests all agree on what
 * "Friday Vocab Battle" actually sets.
 */

import type { ClassroomAccessibility } from '@/shared/types/classroom';
import {
  clampTeamCount,
  type PlayStyle,
} from '@/shared/utils/teamBattle';

export type ClassroomPresetId = 'standard' | 'friday-battle' | 'sped';

/** SPED preset trims the playable vocabulary so rounds stay winnable. */
export const SPED_VOCAB_CAP = 12;

export interface ClassroomPresetValues {
  timerMinutes: number;
  boardSize: 'small' | 'medium' | 'large';
  minWordLength: number;
  playStyle: PlayStyle;
  teamCount: number;
  accessibility: ClassroomAccessibility;
  /** Cap on playable lesson words (0 = no cap). Applied by the launcher. */
  vocabularyCap: number;
}

export const CLASSROOM_PRESETS: Record<ClassroomPresetId, ClassroomPresetValues> = {
  standard: {
    timerMinutes: 3,
    boardSize: 'medium',
    minWordLength: 3,
    playStyle: 'ffa',
    teamCount: 2,
    accessibility: {},
    vocabularyCap: 0,
  },
  // The named weekly ritual: last list, teams by default, loud and fast.
  'friday-battle': {
    timerMinutes: 3,
    boardSize: 'medium',
    minWordLength: 3,
    playStyle: 'teams',
    teamCount: 2,
    accessibility: {},
    vocabularyCap: 0,
  },
  // Support/SPED: fewer words, longer timer, larger type, audio cues, and a
  // flat participation bonus so every student scores.
  sped: {
    timerMinutes: 5,
    boardSize: 'small',
    minWordLength: 2,
    playStyle: 'ffa',
    teamCount: 2,
    accessibility: { largeText: true, audioCues: true, participationPoints: true },
    vocabularyCap: SPED_VOCAB_CAP,
  },
};

export function getPresetValues(id: ClassroomPresetId): ClassroomPresetValues {
  return CLASSROOM_PRESETS[id] ?? CLASSROOM_PRESETS.standard;
}

/**
 * Apply the preset's vocabulary cap. Takes words from the FRONT of the
 * teacher's list — lesson lists are ordered by the teacher (or the starter
 * pack), so the front is what they taught most recently / care about most.
 */
export function applyVocabularyCap(words: string[], cap: number): string[] {
  if (!cap || cap <= 0 || words.length <= cap) return words;
  return words.slice(0, cap);
}

export { clampTeamCount };
