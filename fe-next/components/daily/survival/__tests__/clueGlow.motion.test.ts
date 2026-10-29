import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', '..', '..', '..', 'app', 'animations.css'), 'utf8');

function infiniteAnimationsOf(selectorStart: string): string[] {
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(([, sel]) => sel.trim().startsWith(selectorStart));
  return rules.flatMap(([, , body]) => {
    const m = body.match(/animation:\s*([\w-]+)[^;]*infinite/);
    return m ? [m[1]] : [];
  });
}

function keyframeProps(name: string): string[] {
  const m = css.match(new RegExp(`@keyframes ${name}\\s*\\{((?:[^{}]*\\{[^}]*\\})*)\\s*\\}`));
  if (!m) throw new Error(`no @keyframes ${name}`);
  return [...new Set([...m[1].matchAll(/([a-z-]+)\s*:/g)].map((x) => x[1]))];
}

describe('Word Hunt clue panel idle glow', () => {
  it('Given the clue panel at rest, Then its looping glow moves only opacity or transform, so it never repaints the screen every frame', () => {
    const loops = infiniteAnimationsOf('.clue-container-glow');
    expect(loops.length).toBeGreaterThan(0);
    for (const name of loops) {
      expect({ name, props: keyframeProps(name).filter((p) => p !== 'opacity' && p !== 'transform') }).toEqual({ name, props: [] });
    }
  });
});
