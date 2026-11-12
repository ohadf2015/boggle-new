import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = join(__dirname, '..');

describe('vocab quiz draws only the education mascot', () => {
  it('Given every quiz component, Then none imports the game-mode mascot art', () => {
    const offenders = readdirSync(DIR)
      .filter((f) => /\.tsx?$/.test(f))
      .filter((f) => /components\/ui\/(InteractiveMascot|Mascot)['/]/.test(readFileSync(join(DIR, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
