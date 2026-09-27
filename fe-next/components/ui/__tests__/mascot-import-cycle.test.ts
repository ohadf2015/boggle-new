/**
 * Regression guard for the Turbopack "module factory is not available" crash that
 * fired the AdventureGame error boundary on EVERY level entry.
 *
 * Root cause: InteractiveMascot.tsx and mascotUtils.ts pulled the runtime helpers
 * (getMascotImagePath / getMascotBgType / isVideoVariant / MascotVariant) *through*
 * the heavy 657-line Mascot.tsx component, which merely re-exports them from the leaf
 * module mascotData.ts. That created a runtime module edge to the whole component;
 * under code-splitting it was evaluated before Mascot.tsx's factory registered.
 *
 * Fix + invariant: runtime mascot helpers must be imported from the leaf './mascotData',
 * never the './Mascot' component. Type-only imports from './Mascot' are fine (erased).
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

const UI_DIR = join(__dirname, '..');

/** Strip block + line comments so commented-out imports never trip the guard. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

/**
 * Collect every `import ... from './Mascot'` statement (the component module), returning
 * `{ isTypeOnly, names }` per statement. The `\{[^}]*\}` bound keeps each match inside one
 * statement's braces, so a preceding `./mascotData` import can't bleed into the capture.
 */
function mascotComponentImports(src: string): Array<{ isTypeOnly: boolean; names: string }> {
  const code = stripComments(src);
  const re = /import\s+(type\s+)?\{([^}]*)\}\s+from\s+['"]\.\/Mascot['"]/g;
  const out: Array<{ isTypeOnly: boolean; names: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(code))) out.push({ isTypeOnly: Boolean(m[1]), names: m[2] });
  return out;
}

const RUNTIME_HELPERS = ['getMascotImagePath', 'getMascotBgType', 'isVideoVariant'];

describe('mascot import cycle guard', () => {
  for (const file of ['InteractiveMascot.tsx', 'mascotUtils.ts']) {
    it(`${file} imports runtime mascot helpers from the leaf, not the Mascot component`, () => {
      const src = readFileSync(join(UI_DIR, file), 'utf8');

      for (const { isTypeOnly, names } of mascotComponentImports(src)) {
        // `import type { ... }` is erased at compile time — no runtime module edge. Allowed.
        if (isTypeOnly) continue;
        for (const helper of RUNTIME_HELPERS) {
          const importsHelperAsValue =
            new RegExp(`(^|[,\\s])${helper}(\\s|,|$)`).test(names) &&
            !new RegExp(`type\\s+${helper}\\b`).test(names);
          if (importsHelperAsValue) {
            throw new Error(
              `${file} imports runtime helper "${helper}" from './Mascot'. ` +
                `Import it from './mascotData' instead — routing it through the Mascot ` +
                `component re-creates the Turbopack module-factory crash on adventure level entry.`,
            );
          }
        }
      }
      // Sanity: the helpers must still be imported somewhere from the leaf.
      expect(/from\s+['"]\.\/mascotData['"]/.test(src)).toBe(true);
    });
  }
});
