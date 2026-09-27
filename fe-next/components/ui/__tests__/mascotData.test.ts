import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { getMascotBgTypeForSrc, MASCOT_BG_TYPE, MASCOT_IMAGES } from '../mascotData';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * Regression guard for Sentry JAVASCRIPT-NEXTJS-1MQ:
 * "Attempted to call getMascotBgTypeForSrc() from the server but it is on the client."
 *
 * The pure mascot data/helpers must live OUTSIDE the `'use client'` boundary so
 * server components (e.g. NativePageEnhancements) can call them during render.
 */
describe('mascotData — server-safe pure module', () => {
  it('does NOT declare a "use client" boundary', () => {
    const src = readFileSync(join(here, '..', 'mascotData.ts'), 'utf8');
    expect(src.trimStart().startsWith("'use client'")).toBe(false);
    expect(src.trimStart().startsWith('"use client"')).toBe(false);
  });

  it('resolves bg type from a raw src path', () => {
    expect(getMascotBgTypeForSrc('/mascot/celebration.webp')).toBe('dark');
    expect(getMascotBgTypeForSrc('/mascot/onfire-nobg.webp')).toBe('nobg');
    expect(getMascotBgTypeForSrc('/mascot/something-nobg.webp')).toBe('nobg');
    expect(getMascotBgTypeForSrc('/mascot/unknown.webp')).toBe('dark');
  });

  it('keeps the variant→image and variant→bg maps in sync', () => {
    expect(Object.keys(MASCOT_IMAGES).sort()).toEqual(Object.keys(MASCOT_BG_TYPE).sort());
  });
});

describe('NativePageEnhancements (server component) imports from the pure module', () => {
  it('imports getMascotBgTypeForSrc from mascotData, not the use-client Mascot module', () => {
    const src = readFileSync(
      join(here, '..', '..', 'landing', 'NativePageEnhancements.tsx'),
      'utf8',
    );
    // Must source the runtime helper from the pure module…
    expect(src).toMatch(/getMascotBgTypeForSrc[^;]*from\s+['"][^'"]*mascotData['"]/);
    // …and must NOT pull any runtime value from the 'use client' Mascot module.
    expect(src).not.toMatch(/from\s+['"]@\/components\/ui\/Mascot['"]/);
  });
});
