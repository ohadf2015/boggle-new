import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'HuntBoard.module.css'), 'utf8');

const transitions = () => [...css.matchAll(/(?:^|[;{\s])transition(?:-property)?:\s*([^;}]+)/g)].map((m) => m[1]);

describe('Word Hunt board paint cost', () => {
  it('Given tiles light up during a drag, Then no tile property that repaints (box-shadow) is tweened', () => {
    expect(transitions().filter((t) => /box-shadow|\ball\b/.test(t))).toEqual([]);
  });
});
