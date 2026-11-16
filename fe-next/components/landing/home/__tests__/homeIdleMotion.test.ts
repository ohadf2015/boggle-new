import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * A phone sitting on /he (native WebView, no game open) was heating up and
 * stuttering. The home hero's letter wheel animated background-color and color
 * on every letter forever — paint, not the compositor — and every mode tile
 * kept a transform loop running, so the GPU never idled.
 *
 * Ornamental motion may play a short flourish. On a touch phone it must then
 * hold the resting frame. The wheel's "light" must be opacity/transform only.
 */

const HOME = path.resolve(__dirname, '..');

function read(name: string): string {
  return fs.readFileSync(path.join(HOME, name), 'utf8');
}

/** Full @keyframes body, including every step — a paint property in a later step still counts. */
function keyframes(css: string, name: string): string {
  const start = css.search(new RegExp(`@keyframes\\s+${name}\\s*\\{`));
  if (start < 0) throw new Error(`missing @keyframes ${name}`);
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error(`unclosed @keyframes ${name}`);
}

describe('home idle motion stays off the main thread and then rests on a phone', () => {
  it('the wheel light does not animate paint properties', () => {
    const css = read('DailyWheel.module.css');
    const lit = keyframes(css, 'lit');
    expect(lit).not.toMatch(/background-color/);
    expect(lit).not.toMatch(/(?:^|\s)color\s*:/);
    expect(lit).toMatch(/transform/);
    // The yellow flash is a separate opacity layer, not a fill/text repaint.
    const lamp = keyframes(css, 'lamp');
    expect(lamp).toMatch(/opacity/);
    expect(lamp).not.toMatch(/background-color/);
    expect(lamp).not.toMatch(/(?:^|\s)color\s*:/);
  });

  it('the breathing cube is not a filtered layer inside an infinite transform', () => {
    const tsx = read('DailyWheel.tsx');
    expect(tsx).not.toMatch(/drop-shadow/);
  });

  it('a touch phone stops home ornamental loops after a short flourish', () => {
    const wheel = read('DailyWheel.module.css');
    const grid = read('HomeModeGrid.module.css');
    for (const css of [wheel, grid]) {
      expect(css).toMatch(/@media\s*\(hover:\s*none\)\s*and\s*\(pointer:\s*coarse\)/);
      expect(css).toMatch(/animation-iteration-count:\s*2/);
    }
    // The cap must come after the `infinite` shorthand or the shorthand wins.
    expect(wheel.lastIndexOf('animation-iteration-count: 2')).toBeGreaterThan(
      wheel.lastIndexOf('infinite'),
    );
    expect(grid.lastIndexOf('animation-iteration-count: 2')).toBeGreaterThan(
      grid.lastIndexOf('infinite'),
    );
  });
});
