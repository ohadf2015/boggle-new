import { describe, it, expect } from 'vitest';
import {
  CATALOGUE_CATEGORIES,
  CLASS_FAVORITE_MODES,
  FEATURED_HOME_MODES,
  catalogueEntry,
  catalogueModes,
  isClassFavorite,
} from '@/components/education/ClassroomModeCatalogueData';

const onScreen = () => CATALOGUE_CATEGORIES.flatMap((c) => catalogueModes().filter((m) => m.category === c)).map((m) => m.id);

describe('catalogue order follows what classes actually play', () => {
  it('Given the grouped picker, Then the board group leads with Classic and Blast, the most-played board games', () => {
    const board = catalogueModes().filter((m) => m.category === 'board').map((m) => m.id);
    expect(board.slice(0, 2)).toEqual(['classic', 'blast']);
  });

  it('Given no saved pick, Then the default (first) card is Vocab Quiz, the most-played mode', () => {
    expect(onScreen()[0]).toBe('vocab-quiz');
    expect(catalogueModes()[0].id).toBe('vocab-quiz');
  });

  it('Then the three class favourites are the three most-played modes and each is in the catalogue', () => {
    expect([...CLASS_FAVORITE_MODES]).toEqual(['vocab-quiz', 'classic', 'blast']);
    for (const id of CLASS_FAVORITE_MODES) expect(catalogueEntry(id)).toBeDefined();
    expect(isClassFavorite('classic')).toBe(true);
    expect(isClassFavorite('wheel-rush')).toBe(false);
  });

  it('Then the landing features the class favourites', () => {
    expect([...FEATURED_HOME_MODES]).toEqual([...CLASS_FAVORITE_MODES]);
  });

  it('Then Wordcraft is offered as a projector-optional game, since the wall shows its live race', () => {
    expect(catalogueEntry('wordcraft')!.delivery).toBe('both');
  });
});
