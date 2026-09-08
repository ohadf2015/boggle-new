/**
 * Classroom presets — what each teacher ritual actually sets.
 */

import { describe, it, expect } from 'vitest';
import {
  CLASSROOM_PRESETS,
  getPresetValues,
  applyVocabularyCap,
  SPED_VOCAB_CAP,
} from './classroomPresets';

describe('classroom presets', () => {
  it('friday-battle is a team game by default', () => {
    expect(CLASSROOM_PRESETS['friday-battle'].playStyle).toBe('teams');
  });

  it('sped preset: longer timer, smaller board, shorter words, full accessibility', () => {
    const sped = CLASSROOM_PRESETS.sped;
    expect(sped.timerMinutes).toBeGreaterThan(CLASSROOM_PRESETS.standard.timerMinutes);
    expect(sped.boardSize).toBe('small');
    expect(sped.minWordLength).toBeLessThan(CLASSROOM_PRESETS.standard.minWordLength);
    expect(sped.accessibility).toEqual({
      largeText: true,
      audioCues: true,
      participationPoints: true,
    });
    expect(sped.vocabularyCap).toBe(SPED_VOCAB_CAP);
  });

  it('unknown preset id falls back to standard', () => {
    // @ts-expect-error — deliberately invalid id
    expect(getPresetValues('nope')).toEqual(CLASSROOM_PRESETS.standard);
  });
});

describe('applyVocabularyCap', () => {
  const words = Array.from({ length: 20 }, (_, i) => `word${i}`);

  it('trims to the front of the list when over cap', () => {
    const capped = applyVocabularyCap(words, SPED_VOCAB_CAP);
    expect(capped).toHaveLength(SPED_VOCAB_CAP);
    expect(capped[0]).toBe('word0');
  });

  it('leaves short lists and zero cap untouched', () => {
    expect(applyVocabularyCap(['a', 'b'], SPED_VOCAB_CAP)).toEqual(['a', 'b']);
    expect(applyVocabularyCap(words, 0)).toHaveLength(20);
  });
});
