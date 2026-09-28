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

  it('does not statically import EssentialProviders (Auth/Music/Query/PostHog)', () => {
    expect(SOURCE).not.toMatch(
      /import\s*\{[^}]*EssentialProviders[^}]*\}\s*from\s*['"]\.\/essential-providers['"]/,
    );
  });

  it('loads EssentialProviders through next/dynamic so the game route does not eagerly parse it', () => {
    expect(SOURCE).toMatch(/import\(['"]\.\/essential-providers['"]\)/);
  });

  // r6: #1175's two-rAF mount gate was reverted — gating the dynamic chunk on
  // rAF timestamps made Lantern serialize that fetch behind main-thread work
  // (the ~11s simulated LCP tail in r5). Providers mount immediately; the chunk
  // split itself is kept. Assert the gate is gone so it cannot silently return.
  it('does not gate the mount on rAF / after-first-paint (r6 revert of #1175)', () => {
    expect(SOURCE).not.toMatch(/shouldMountHeavyClientBoot/);
    expect(SOURCE).not.toMatch(/useAfterFirstPaint/);
  });
});
