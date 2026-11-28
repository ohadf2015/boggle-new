import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
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

  it.each(modes.map((m) => [m.id, m.cover]))('%s has a full poster cover for its card, shipped and light', (id, cover) => {
    expect(cover).toBe(`/mascot/teacher/modes/covers-v3/${id}.webp`);
    const file = path.join(PUBLIC, cover);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(80_000);
  });

  it.each(modes.map((m) => [m.id, m.sticker]))('%s has a cube-mascot sticker on a transparent background, shipped and light', (id, sticker) => {
    expect(sticker).toBe(`/mascot/teacher/modes/stickers/${id}.webp`);
    const file = path.join(PUBLIC, sticker);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(60_000);
    expect(readFileSync(file).subarray(12, 16).toString()).toBe('VP8X');
  });
});
