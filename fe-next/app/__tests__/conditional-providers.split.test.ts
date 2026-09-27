/**
 * Homepage PSI: GameSpecificProviders (socket/howler/game stack) must not be a
 * static import of ConditionalProviders. ConditionalProviders mounts on every
 * [locale] route, including `/` where needsGameProviders is false — a static
 * import still puts the game graph in the layout chunk (Lighthouse bootup).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE = readFileSync(join(__dirname, '..', 'conditional-providers.tsx'), 'utf8');

describe('ConditionalProviders game-stack split', () => {
  it('does not statically import GameSpecificProviders from ./providers', () => {
    expect(SOURCE).not.toMatch(
      /import\s*\{[^}]*GameSpecificProviders[^}]*\}\s*from\s*['"]\.\/providers['"]/,
    );
  });

  it('loads GameSpecificProviders through next/dynamic so `/` does not parse the game chunk', () => {
    expect(SOURCE).toMatch(/next\/dynamic/);
    expect(SOURCE).toMatch(/GameSpecificProviders/);
    expect(SOURCE).toMatch(/import\(['"]\.\/providers['"]\)/);
  });
});
