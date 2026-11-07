import { describe, it, expect } from 'vitest';
import {
  CATALOGUE_CATEGORIES,
  CLASS_FAVORITE_MODES,
  FEATURED_HOME_MODES,
  catalogueEntry,
  catalogueKeys,
  catalogueModes,
  isClassFavorite,
} from '@/components/education/ClassroomModeCatalogueData';

const onScreen = () => CATALOGUE_CATEGORIES.flatMap((c) => catalogueModes().filter((m) => m.category === c)).map((m) => m.id);

describe('catalogue order leads with the games classes finish', () => {
  it('Given the grouped picker, Then Classic and Vocab Quiz come first, the two modes most rounds actually start and finish', () => {
    expect(onScreen().slice(0, 2)).toEqual(['classic', 'vocab-quiz']);
    expect(catalogueModes()[0].id).toBe('classic');
    expect(catalogueModes().filter((m) => m.category === 'finish').map((m) => m.id)).toEqual(['classic', 'vocab-quiz']);
  });

  it('Then Wordcraft and Crossword sit together in a "play together" group, each with a one-line hint for students', () => {
    const together = catalogueModes().filter((m) => m.category === 'together');
    expect(together.map((m) => m.id)).toEqual(['wordcraft', 'crossword']);
    for (const mode of together) {
      expect(catalogueKeys(mode).hint).toBe(`eg2Modes.hint.${mode.id}`);
      expect(mode.style).toBe('together');
    }
  });

  it('Then the start-here pair carries a student hint too, and the board games none', () => {
    for (const mode of catalogueModes().filter((m) => m.category === 'finish')) expect(catalogueKeys(mode).hint).toBe(`eg2Modes.hint.${mode.id}`);
    for (const mode of catalogueModes().filter((m) => m.category === 'board')) expect(catalogueKeys(mode).hint).toBeNull();
  });

  it('Then the board group leads with Blast, and Boss Battle runs the free dragon', () => {
    const board = catalogueModes().filter((m) => m.category === 'board').map((m) => m.id);
    expect(board[0]).toBe('blast');
    expect(board).toContain('boss-battle');
    expect(catalogueEntry('boss-battle')!.launch.classroomBossId).toBe('lexiconDragon');
  });

  it('Then the class favourites the landing and Teacher Home use are unchanged', () => {
    expect([...CLASS_FAVORITE_MODES]).toEqual(['vocab-quiz', 'classic', 'blast']);
    for (const id of CLASS_FAVORITE_MODES) expect(catalogueEntry(id)).toBeDefined();
    expect(isClassFavorite('classic')).toBe(true);
    expect(isClassFavorite('wheel-rush')).toBe(false);
    expect([...FEATURED_HOME_MODES]).toEqual([...CLASS_FAVORITE_MODES]);
  });

  it('Then Wordcraft is offered as a projector-optional game, since the wall shows its live race', () => {
    expect(catalogueEntry('wordcraft')!.delivery).toBe('both');
  });
});
