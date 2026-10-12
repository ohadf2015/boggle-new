import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '..', 'HuntBoard.module.css'), 'utf8');

function rule(selector: string): string {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`(?:^|\\n)${esc}\\s*\\{([^}]*)\\}`));
  if (!block) throw new Error(`no rule for ${selector}`);
  return block[1];
}

function clampAt(decl: string, vw: number): number {
  const m = decl.match(/clamp\((\d+(?:\.\d+)?)px,\s*(\d+(?:\.\d+)?)vw,\s*(\d+(?:\.\d+)?)px\)/);
  if (!m) throw new Error(`not a px/vw clamp: ${decl}`);
  return Math.min(Number(m[3]), Math.max(Number(m[1]), (Number(m[2]) * vw) / 100));
}

const BORDER = 3;
const PAGE_GUTTER = 8;
const COLS = 6;

describe('Word Hunt board sizing on a phone', () => {
  const wrap = rule('.wrap');
  const pad = (vw: number) => clampAt(wrap.match(/--pad:\s*([^;]+);/)![1], vw);
  const gap = (vw: number) => clampAt(wrap.match(/--gap:\s*([^;]+);/)![1], vw);
  const tileAt = (vw: number) => (vw - 2 * PAGE_GUTTER - 2 * BORDER - 2 * pad(vw) - (COLS - 1) * gap(vw)) / COLS;

  it('Given a 390px phone and a full-width 6x6 board, Then each tile is at least 55px (the pre-redesign board measured 55)', () => {
    expect(tileAt(390)).toBeGreaterThanOrEqual(55);
  });

  it('Given a 375px phone, Then the tray gutters still leave tiles of at least 53px', () => {
    expect(tileAt(375)).toBeGreaterThanOrEqual(53);
  });

  it('Then the letter is at least half the tile column, so it grows with the tile', () => {
    const factor = Number(rule('.glyph').match(/font-size:\s*calc\(100cqw \/ var\(--cols\) \* ([\d.]+)\)/)![1]);
    expect(factor).toBeGreaterThanOrEqual(0.5);
  });
});
