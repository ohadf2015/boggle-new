import { describe, it, expect } from 'vitest';
import { catalogueEntry, catalogueModes } from '@/components/education/ClassroomModeCatalogueData';

describe('classroom mode catalogue', () => {
  it('offers Wordcraft as a pickable card that launches its own engine', () => {
    const craft = catalogueEntry('wordcraft');
    expect(craft).toBeDefined();
    expect(craft!.launch.gameMode).toBe('wordcraft');
    expect(craft!.nameKey).toBeTruthy();
    expect(craft!.cover).toMatch(/wordcraft\.webp$/);
  });

  it('does not label Wordcraft harder than the board modes a class already plays', () => {
    expect(catalogueEntry('wordcraft')!.complexity).not.toBe('tricky');
  });

  it('offers Crossword to every teacher: one board per phone raced on one class leaderboard, no teams, not Pro', () => {
    const crossword = catalogueModes().find((m) => m.id === 'crossword');
    expect(crossword).toMatchObject({ style: 'together', teamsCapable: false, delivery: 'phones', nameKey: 'eduCrossword.name', stepsKey: 'eduCrossword.steps' });
  });
});
