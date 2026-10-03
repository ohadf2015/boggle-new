import { describe, it, expect, beforeEach } from 'vitest';
import {
  BOSS_BATTLE_ID,
  catalogueIdOf,
  launchOf,
  readLocalQuizVariant,
  writeLocalQuizVariant,
} from '../classroomCatalogueId';

describe('classroom catalogue ids', () => {
  beforeEach(() => sessionStorage.clear());

  it('launches Boss Battle as the vocab quiz with the boss variant', () => {
    expect(launchOf(BOSS_BATTLE_ID)).toEqual({ gameMode: 'vocab-quiz', vocabQuizVariant: 'boss' });
    expect(launchOf('blast')).toEqual({ gameMode: 'blast' });
    expect(launchOf('vocab-quiz')).toEqual({ gameMode: 'vocab-quiz' });
  });

  it('reads a room back to the card it was launched from', () => {
    expect(catalogueIdOf('vocab-quiz', 'boss')).toBe(BOSS_BATTLE_ID);
    expect(catalogueIdOf('vocab-quiz', null)).toBe('vocab-quiz');
    expect(catalogueIdOf('classic', 'boss')).toBe('classic');
  });

  it('keeps the variant beside the mode in the teacher\'s lessonGameData', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'vocab-quiz', lessonId: 'l1' }));
    writeLocalQuizVariant('boss');
    expect(readLocalQuizVariant()).toBe('boss');
    expect(JSON.parse(sessionStorage.getItem('lessonGameData')!)).toMatchObject({ lessonId: 'l1', vocabQuizVariant: 'boss' });
    writeLocalQuizVariant(null);
    expect(readLocalQuizVariant()).toBeNull();
  });

  it('survives storage that is missing or broken', () => {
    expect(readLocalQuizVariant()).toBeNull();
    sessionStorage.setItem('lessonGameData', '{nope');
    expect(readLocalQuizVariant()).toBeNull();
    expect(() => writeLocalQuizVariant('boss')).not.toThrow();
  });
});
