import { describe, it, expect, beforeEach } from 'vitest';
import {
  BOSS_BATTLE_ID,
  catalogueIdOf,
  launchOf,
  readLocalQuizVariant,
  writeLocalQuizVariant,
  readLocalBossId,
  writeLocalBossId,
} from '../classroomCatalogueId';

describe('classroom catalogue ids', () => {
  beforeEach(() => sessionStorage.clear());

  it('launches Boss Battle as a classic board fought against a boss (the free dragon unless one is picked)', () => {
    expect(launchOf(BOSS_BATTLE_ID)).toEqual({ gameMode: 'classic', classroomBossId: 'lexiconDragon' });
    expect(launchOf(BOSS_BATTLE_ID, 'msGrammar')).toEqual({ gameMode: 'classic', classroomBossId: 'msGrammar' });
    expect(launchOf('classic', 'msGrammar')).toEqual({ gameMode: 'classic' });
    expect(launchOf('blast')).toEqual({ gameMode: 'blast' });
    expect(launchOf('vocab-quiz')).toEqual({ gameMode: 'vocab-quiz' });
  });

  it('reads a room back to the card it was launched from', () => {
    expect(catalogueIdOf('vocab-quiz', 'boss')).toBe(BOSS_BATTLE_ID);
    expect(catalogueIdOf('vocab-quiz', null)).toBe('vocab-quiz');
    expect(catalogueIdOf('classic', 'boss')).toBe('classic');
    expect(catalogueIdOf('classic', null, 'spellingBee')).toBe(BOSS_BATTLE_ID);
    expect(catalogueIdOf('blast', null, 'spellingBee')).toBe('blast');
    expect(catalogueIdOf('classic', null, 'notABoss')).toBe('classic');
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

  it('keeps the chosen boss beside the mode in lessonGameData, and clears it', () => {
    sessionStorage.setItem('lessonGameData', JSON.stringify({ gameMode: 'classic' }));
    writeLocalBossId('captainMetaphor');
    expect(readLocalBossId()).toBe('captainMetaphor');
    writeLocalBossId(null);
    expect(readLocalBossId()).toBeNull();
    sessionStorage.setItem('lessonGameData', JSON.stringify({ classroomBossId: 'bogus' }));
    expect(readLocalBossId()).toBeNull();
  });
});
