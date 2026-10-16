import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { catalogueModes } from '../ClassroomModeCatalogueData';

const PUBLIC = path.resolve(__dirname, '..', '..', '..', 'public');

describe('classroom mode card art', () => {
  const modes = catalogueModes();

  it('covers every catalogue mode', () => {
    expect(modes.length).toBeGreaterThanOrEqual(7);
  });

  it.each(modes.map((m) => [m.id, m.poster]))('%s uses the matching sticker art set, shipped and light', (_id, poster) => {
    expect(poster).toMatch(/^\/mascot\/teacher\/modes\/[a-z-]+\.webp$/);
    const file = path.join(PUBLIC, poster);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(80_000);
  });
});
