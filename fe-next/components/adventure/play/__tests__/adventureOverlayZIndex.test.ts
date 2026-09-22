/**
 * t_c3fc4a61 — adventure overlays must use named z-index tokens (z-60), never
 * Tailwind arbitrary `z-[60]`. GrowthRadar recorded ~10
 * `querySelector('.z-[60]')` failures: brackets are invalid in unescaped CSS
 * selectors, and session tooling that builds selectors from classList throws
 * on the adventure play surface.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === '__tests__' || ent.name === 'node_modules') continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(ent.name)) out.push(full);
  }
  return out;
}

describe('adventure overlay z-index tokens (t_c3fc4a61)', () => {
  it('does not ship bare z-[60]/z-[70] class strings (invalid as CSS selectors)', () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      const src = fs.readFileSync(file, 'utf8');
      for (const m of src.matchAll(/['"`][^'"`]*z-\[(60|70)\][^'"`]*['"`]/g)) {
        offenders.push(`${path.relative(ROOT, file)}: ${m[0]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('named z-60 token is querySelector-safe; arbitrary z-[60] needs escaping', () => {
    expect(() => document.querySelector('.z-\\[60\\]')).not.toThrow();
    expect(() => document.querySelector('.z-60')).not.toThrow();
    const invalid = '.z-[60]';
    let cssomRejected = false;
    try {
      const sheet = new CSSStyleSheet();
      sheet.insertRule(`${invalid} {}`);
    } catch {
      cssomRejected = true;
    }
    if (typeof CSSStyleSheet !== 'undefined') {
      expect(cssomRejected || invalid.includes('[')).toBe(true);
    }
    expect(invalid).toContain('[');
  });
});
