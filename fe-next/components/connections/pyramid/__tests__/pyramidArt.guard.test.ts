import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { PYRAMID_ART } from '../pyramidArt';

const PUBLIC = path.resolve(__dirname, '../../../../public');

describe('pyramid art', () => {
  it.each(Object.entries(PYRAMID_ART))('%s is a small webp under public/', (_name, src) => {
    expect(src).toMatch(/^\/daily\/pyramid\/[a-z-]+\.webp$/);
    const file = path.join(PUBLIC, src);
    expect(existsSync(file)).toBe(true);
    expect(statSync(file).size).toBeLessThan(150 * 1024);
  });
});
