import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Tailwind v4 generates NO CSS for a colour class it cannot resolve, and says
 * nothing. `text-neo-gray-200` shipped 386 times (since the 2026-03 SEO sprint)
 * against a config that only defined a flat `neo.gray`, so every "muted" line
 * silently rendered in its parent's full-brightness colour.
 */

const REPO = path.resolve(__dirname, '../..');
const config = require(path.join(REPO, 'tailwind.config.js'));

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '__tests__') walk(full, out);
    } else if (/\.tsx?$/.test(e.name) && !e.name.includes('.test.')) {
      out.push(full);
    }
  }
  return out;
}

describe('design token integrity', () => {
  it('every neo-gray-<shade> class used in the app is defined in tailwind.config.js', () => {
    const gray = config.theme.extend.colors.neo.gray;
    const defined = typeof gray === 'object' ? Object.keys(gray) : [];

    const used = new Set<string>();
    for (const root of ['app', 'components']) {
      for (const file of walk(path.join(REPO, root))) {
        for (const m of fs.readFileSync(file, 'utf8').matchAll(/-neo-gray-(\d{2,3})\b/g)) {
          used.add(m[1]);
        }
      }
    }

    expect(used.size).toBeGreaterThan(0);
    expect([...used].filter((shade) => !defined.includes(shade)).sort()).toEqual([]);
  });

  it('keeps plain `neo-gray` resolving after the scale is added', () => {
    const gray = config.theme.extend.colors.neo.gray;
    expect(typeof gray === 'object' ? gray.DEFAULT : gray).toBe('var(--neo-gray)');
  });

  it('OS reduced-motion stops the perpetual Tailwind loops, not just cosy mode', () => {
    const css = fs.readFileSync(path.join(REPO, 'app/globals.css'), 'utf8');
    const blocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?)\n\}/g)].map(
      (m) => m[1],
    );
    for (const cls of ['.animate-pulse', '.animate-bounce', '.animate-ping', '.animate-pulse-ring']) {
      expect(
        blocks.some((b) => b.includes(cls) && /animation:\s*none/.test(b)),
        `${cls} not disabled under prefers-reduced-motion`,
      ).toBe(true);
    }
  });
});
