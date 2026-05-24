import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { contrastRatio } from '../colorContrast';

const CSS_PATH = resolve(__dirname, '../../../app/globals.css');

/** Extract the body of the first `html[data-cosy='true'] { ... }` rule. */
function cosyBlock(css: string): string {
  const m = css.match(/html\[data-cosy=['"]true['"]\]\s*\{([\s\S]*?)\}/);
  if (!m) throw new Error("No html[data-cosy='true'] block found in globals.css");
  return m[1];
}

/** Read a `--token: value;` declaration's value from a block. */
function tokenValue(block: string, name: string): string | null {
  const m = block.match(new RegExp(`${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

const AA = 4.5;

describe('cosy calm-palette contract (globals.css)', () => {
  let block: string;
  beforeAll(() => {
    block = cosyBlock(readFileSync(CSS_PATH, 'utf8'));
  });

  it('overrides the background to a warm dusk (not the loud default)', () => {
    const navy = tokenValue(block, '--neo-navy');
    expect(navy, 'cosy must override --neo-navy').toBeTruthy();
    // white text on the dusk bg must clear AA, incl. headroom for /70 opacity variants
    expect(contrastRatio('255 255 255', navy!)).toBeGreaterThanOrEqual(6);
  });

  it('keeps cream surface light and charcoal ink legible on it', () => {
    const cream = tokenValue(block, '--neo-cream');
    const ink = tokenValue(block, '--neo-black');
    expect(cream, 'cosy must define --neo-cream').toBeTruthy();
    expect(ink, 'cosy must soften --neo-black to charcoal').toBeTruthy();
    expect(ink).not.toBe('0 0 0'); // softened, not pure black
    expect(contrastRatio(ink!, cream!)).toBeGreaterThanOrEqual(AA);
  });

  it('removes decorative noise', () => {
    expect(tokenValue(block, '--halftone-pattern')).toBe('none');
    expect(tokenValue(block, '--retro-grid-pattern')).toBe('none');
  });

  it('softens shadows to diffuse (blur present, no hard 0px stamp)', () => {
    const md = tokenValue(block, '--shadow-md');
    expect(md, 'cosy must override --shadow-md').toBeTruthy();
    expect(md).not.toMatch(/0px\s+rgb/); // not the "Npx Npx 0px" hard stamp
  });

  it('bright accents (sage/teal/yellow/orange) stay legible with BLACK text', () => {
    const ink = '0 0 0';
    for (const name of ['--neo-lime', '--neo-cyan', '--neo-yellow', '--neo-orange']) {
      const v = tokenValue(block, name);
      expect(v, `cosy must define ${name}`).toBeTruthy();
      expect(contrastRatio(ink, v!), `${name} vs black`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('dark accents (rose/lavender) stay legible with WHITE text', () => {
    const white = '255 255 255';
    for (const name of ['--neo-pink', '--neo-purple']) {
      const v = tokenValue(block, name);
      expect(v, `cosy must define ${name}`).toBeTruthy();
      expect(contrastRatio(white, v!), `${name} vs white`).toBeGreaterThanOrEqual(AA);
    }
  });

  it('keeps error red hot (does NOT calm safety semantics)', () => {
    // --neo-red must NOT be overridden inside the cosy block
    expect(tokenValue(block, '--neo-red')).toBeNull();
  });
});

describe('cosy structural softening (globals.css)', () => {
  const css = readFileSync(CSS_PATH, 'utf8');

  it('softens the Tailwind shadow-hard utilities under cosy', () => {
    const rule = css.match(
      /html\[data-cosy=['"]true['"]\][^{]*\.shadow-hard[^{]*\{[^}]*box-shadow:[^}]*\}/,
    );
    expect(rule, 'cosy must override .shadow-hard box-shadow').toBeTruthy();
    expect(rule![0]).not.toMatch(/0px\s+rgb/); // diffuse, not hard stamp
  });

  it('suppresses the halftone texture overlays under cosy', () => {
    expect(
      /html\[data-cosy=['"]true['"]\][^{]*\.texture-halftone[^{]*\{[^}]*display:\s*none/.test(css),
    ).toBe(true);
  });
});
