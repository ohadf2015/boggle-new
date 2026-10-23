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

  it('keeps beta-only Crossword out of the classroom', () => {
    expect(catalogueModes().map((m) => m.id)).not.toContain('crossword');
  });
});
