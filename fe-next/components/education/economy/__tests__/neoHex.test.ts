import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { NEO_HEX } from '../neoHex';
import { BURST_COLORS } from '../cashBurst';
import { chestRays } from '../chestPhase';

const css = fs.readFileSync(path.join(process.cwd(), 'app/globals.css'), 'utf8');
const ECONOMY = path.join(process.cwd(), 'components/education/economy');

describe('economy colours come from the neo palette', () => {
  it.each(['lime', 'pink', 'cyan', 'yellow', 'orange', 'cream'] as const)('NEO_HEX.%s matches --neo-%s in globals.css', (name) => {
    const m = css.match(new RegExp(`--neo-${name}:\\s*(#[0-9a-fA-F]{6})`));
    expect(m?.[1].toLowerCase()).toBe(NEO_HEX[name]);
  });

  it('Given the cash burst and chest rays, Then every colour is a neo token', () => {
    const palette = new Set(Object.values(NEO_HEX));
    for (const c of BURST_COLORS) expect(palette).toContain(c);
    for (const r of (['common', 'rare', 'epic'] as const).map(chestRays)) expect(palette).toContain(r.hex);
  });

  it('Given the economy sources, Then no raw hex colour literal is left outside the palette file', () => {
    const files = fs.readdirSync(ECONOMY).filter((f) => /\.tsx?$/.test(f) && f !== 'neoHex.ts');
    const hits = files.flatMap((f) =>
      (fs.readFileSync(path.join(ECONOMY, f), 'utf8').match(/['"`]#[0-9a-fA-F]{3,8}['"`]/g) ?? []).map((h) => `${f}: ${h}`),
    );
    expect(hits).toEqual([]);
  });
});
