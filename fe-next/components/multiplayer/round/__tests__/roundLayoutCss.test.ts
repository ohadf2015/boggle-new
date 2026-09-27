import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(__dirname, '../round.module.css'), 'utf8');

describe('round frame CSS — 10-ft TV', () => {
  it('Given a 1920×1080 TV, the board column is capped at the board\'s achievable (height-bound) size, so the side rails widen instead of the board floating in dead margins', () => {
    const tv = css.slice(css.indexOf('@media (min-width: 1800px) and (min-height: 1000px)'));
    expect(tv).toMatch(/grid-template-columns:[^;]*min\(1100px,\s*calc\(100dvh - [0-9.]+(px|rem)\)\)/);
  });
});
