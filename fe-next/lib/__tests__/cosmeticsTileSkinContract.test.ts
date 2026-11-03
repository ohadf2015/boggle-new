import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';
import { COSMETICS } from '../cosmetics';
import { WORLD_SKIN_WORLDS, worldSkinId } from '../adventure/play/worldSkins';

const css = readFileSync(join(__dirname, '../../app/cosmetics.css'), 'utf-8');
const boardCss = readFileSync(join(__dirname, '../../components/board/LetterBoard.module.css'), 'utf-8');
const boardTsx = readFileSync(join(__dirname, '../../components/board/LetterBoard.tsx'), 'utf-8');

type Rgb = [number, number, number];
const hex = (h: string): Rgb => {
  const n = h.replace('#', '');
  const f = n.length === 3 ? n.split('').map((c) => c + c).join('') : n;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16)) as Rgb;
};
const lum = (c: Rgb) =>
  c.map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((a, v, i) => a + v * [0.2126, 0.7152, 0.0722][i], 0);
const ratio = (a: Rgb, b: Rgb) => {
  const [x, y] = [lum(a), lum(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Colour of the base (last) gradient at 50%, where the letter sits. */
function centreColour(background: string): Rgb {
  const layers = background.match(/(?:linear|radial)-gradient\((?:[^()]|\([^()]*\))*\)/g) ?? [];
  const base = layers[layers.length - 1];
  const stops = [...base.matchAll(/(#[0-9a-f]{3,6})\s+(\d+)%/gi)].map((m) => ({ c: hex(m[1]), at: Number(m[2]) }));
  const after = stops.findIndex((s) => s.at >= 50);
  if (after <= 0) return stops[Math.max(after, 0)].c;
  const [a, b] = [stops[after - 1], stops[after]];
  const t = (50 - a.at) / (b.at - a.at);
  return a.c.map((v, i) => Math.round(v + (b.c[i] - v) * t)) as Rgb;
}

const skins = [
  ...COSMETICS.filter((c) => c.category === 'tileSkin' && c.id !== 'tile-default').map((c) => c.id.replace('tile-', '')),
  ...WORLD_SKIN_WORLDS.map((w) => worldSkinId(w).replace('tile-', '')),
];

describe('tile skins on the shared letter board', () => {
  it('the board gives idle tiles the class every skin rule targets', () => {
    expect(boardTsx).toMatch(/styles\.tile,.*'letter-tile-gradient'/);
  });

  it.each(skins)('skin %s targets only idle tiles (not selected, not mid-verdict)', (skin) => {
    expect(css).toContain(`[data-tile-skin='${skin}'] .letter-tile-gradient:not([data-sel]):not([data-fx])`);
  });

  it.each(skins)('skin %s letter ink keeps >= 4.5:1 at the tile centre', (skin) => {
    const ink = new RegExp(`\\[data-tile-skin='${skin}'\\] \\{ --tile-ink: (#[0-9a-f]+); \\}`, 'i').exec(css);
    const rule = new RegExp(`\\[data-tile-skin='${skin}'\\] \\.letter-tile-gradient[^{]*\\{([^}]*)\\}`).exec(css);
    expect(ink, `--tile-ink for ${skin}`).not.toBeNull();
    expect(rule, `face rule for ${skin}`).not.toBeNull();
    const background = rule![1].split(/border-color/)[0];
    expect(ratio(hex(ink![1]), centreColour(background))).toBeGreaterThanOrEqual(4.5);
  });

  it('a glyph on any non-idle tile ignores the skin ink', () => {
    const reset = /\.glyph\[data-hint\],\s*\.glyph\[data-marked\],\s*\.glyph\[data-fx\]\s*\{\s*color:\s*var\(--ink\)/;
    expect(boardCss).toMatch(reset);
  });
});
