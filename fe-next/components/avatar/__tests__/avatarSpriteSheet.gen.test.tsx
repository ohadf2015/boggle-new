/**
 * Sprite-sheet generator (NOT a CI test — gated behind GEN_SPRITES=1).
 *
 * Renders every part in a category through the real SSR renderer into one
 * labeled PNG contact sheet, so a human/agent can eyeball all parts at once
 * and spot clipping / empty / misaligned parts. This is the visual worklist.
 *
 *   GEN_SPRITES=1 npx vitest run components/avatar/__tests__/avatarSpriteSheet.gen.test.tsx
 *   -> writes /tmp/avatar-sprites/<category>.png
 *
 * Also supports conflict-pair sheets (hats x tall hair, glasses x eyes, etc.)
 * via the SAME machinery.
 */
import { describe, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';
import AvatarRendererSsr from '../AvatarRendererSsr';
import {
  DEFAULT_AVATAR_CONFIG,
  AVATAR_BASES,
  AVATAR_HAIR_STYLES,
  AVATAR_EYE_STYLES,
  AVATAR_MOUTH_STYLES,
  AVATAR_ACCESSORIES,
  AVATAR_FACIAL_HAIR_STYLES,
  AVATAR_EYEBROW_STYLES,
  isPremiumPart,
  isEpicPart,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

const ENABLED = process.env.GEN_SPRITES === '1';
const OUT = '/tmp/avatar-sprites';
const CELL = 96; // px per avatar
const PAD = 8;
const LABEL_H = 16;
const COLS = 8;

function partSvgInner(config: CustomAvatarConfig): string {
  const markup = renderToStaticMarkup(
    React.createElement(AvatarRendererSsr, { config, size: 100 }),
  );
  // strip the outer <svg ...> wrapper; inner content is in viewBox 0..100 units
  return markup.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function sheet(name: string, cells: Array<{ label: string; config: CustomAvatarConfig; tag?: string }>) {
  const rows = Math.ceil(cells.length / COLS);
  const cw = CELL + PAD;
  const ch = CELL + LABEL_H + PAD;
  const W = COLS * cw + PAD;
  const H = rows * ch + PAD + 28;
  const parts = cells
    .map((c, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = PAD + col * cw;
      const y = PAD + 28 + row * ch;
      const tagColor = c.tag === 'EPIC' ? '#8B5CF6' : c.tag === 'LEGENDARY' ? '#FFD700' : c.tag === 'VIP' ? '#FFE135' : '';
      const tag = c.tag
        ? `<text x="${x + CELL / 2}" y="${y + 11}" font-size="8" font-weight="900" fill="${tagColor}" text-anchor="middle">${c.tag}</text>`
        : '';
      return `<g transform="translate(${x},${y}) scale(${CELL / 100})">${partSvgInner(c.config)}</g>
        <text x="${x + CELL / 2}" y="${y + CELL + 11}" font-size="9" fill="#fff" text-anchor="middle">${esc(c.label)}</text>${tag}`;
    })
    .join('\n');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#0f0f1e"/>
    <text x="${PAD}" y="20" font-size="16" font-weight="900" fill="#BFFF00">${esc(name)} (${cells.length})</text>
    ${parts}
  </svg>`;
  mkdirSync(OUT, { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(`${OUT}/${name}.png`);
  writeFileSync(`${OUT}/${name}.svg`, svg);
}

function tagFor(cat: string, part: string): string | undefined {
  if (!isPremiumPart(cat, part)) return undefined;
  if (isEpicPart(cat, part)) return 'EPIC';
  return 'VIP';
}

describe.skipIf(!ENABLED)('avatar sprite sheets', () => {
  it('renders category contact sheets', async () => {
    const cats: Array<[string, readonly string[], keyof CustomAvatarConfig]> = [
      ['bases', AVATAR_BASES, 'base'],
      ['hair', AVATAR_HAIR_STYLES, 'hair'],
      ['eyes', AVATAR_EYE_STYLES, 'eyes'],
      ['mouth', AVATAR_MOUTH_STYLES, 'mouth'],
      ['accessories', AVATAR_ACCESSORIES, 'accessory'],
      ['facialHair', AVATAR_FACIAL_HAIR_STYLES, 'facialHair'],
      ['eyebrows', AVATAR_EYEBROW_STYLES, 'eyebrows'],
    ];
    const catKey: Record<string, string> = {
      bases: 'base', hair: 'hair', eyes: 'eyes', mouth: 'mouth',
      accessories: 'accessory', facialHair: 'facialHair', eyebrows: 'eyebrows',
    };
    for (const [name, vals, field] of cats) {
      await sheet(
        name,
        vals.map((v) => ({
          label: v,
          tag: tagFor(catKey[name], v),
          config: { ...DEFAULT_AVATAR_CONFIG, [field]: v } as CustomAvatarConfig,
        })),
      );
    }
  }, 120_000);

  it('renders focused new-part sheets', async () => {
    const cleanHair = { ...DEFAULT_AVATAR_CONFIG, hair: 'none' as never };
    const newAccessories = [
      'angelWings', 'demonWings', 'butterflyWings', 'gamerHeadset', 'cowboyHat',
      'pirateHat', 'topHat', 'graduationCap', 'tinfoilHat', 'duckHat', 'vrHeadset',
      'frogHat', 'flamingHalo', 'iceCrown', 'crystalCrown',
    ];
    await sheet(
      'new-accessories',
      newAccessories.map((v) => ({
        label: v,
        tag: tagFor('accessory', v),
        config: { ...cleanHair, accessory: v as never } as CustomAvatarConfig,
      })),
    );
    const focus = process.env.FOCUS_PARTS;
    if (focus) {
      const [cat, field, ...ids] = focus.split(',');
      const extra = process.env.FOCUS_COLOR
        ? { [process.env.FOCUS_COLOR.split('=')[0]]: process.env.FOCUS_COLOR.split('=')[1] }
        : {};
      await sheet(
        `focus-${cat}`,
        ids.map((v) => ({
          label: v,
          tag: tagFor(cat, v),
          config: { ...cleanHair, ...extra, [field]: v as never } as CustomAvatarConfig,
        })),
      );
    }
  }, 120_000);

  it('renders conflict-pair sheets', async () => {
    // tall hair x hats/crowns/visors — the real top-layer clip surface
    const tallHair = ['spiky', 'mohawk', 'lightning', 'rainbowMohawk', 'iceSpikes', 'afro'];
    const hats = ['crown', 'cowboyHat', 'pirateHat', 'topHat', 'graduationCap', 'vrHeadset', 'iceCrown', 'crystalCrown'];
    const hairHatCells: Array<{ label: string; config: CustomAvatarConfig }> = [];
    for (const h of tallHair) for (const a of hats) {
      hairHatCells.push({ label: `${h}+${a}`, config: { ...DEFAULT_AVATAR_CONFIG, hair: h as never, accessory: a as never } });
    }
    await sheet('conflict-hair-x-hat', hairHatCells);

    // glasses/visor x eye styles
    const eyewear = ['glasses', 'sunglasses', 'vrHeadset', 'cyberpunkVisor', 'monocle'];
    const eyeStyles = ['round', 'glitchEyes', 'rainbowEyes', 'pixelEyes', 'targetEyes', 'kawaii', 'thirdEye'];
    const eyewearCells: Array<{ label: string; config: CustomAvatarConfig }> = [];
    for (const e of eyewear) for (const ey of eyeStyles) {
      eyewearCells.push({ label: `${e}+${ey}`, config: { ...DEFAULT_AVATAR_CONFIG, accessory: e as never, eyes: ey as never } });
    }
    await sheet('conflict-eyewear-x-eyes', eyewearCells);

    // facial hair x mouth
    const beards = ['fullBeard', 'rainbowBeard', 'flameBeard', 'goatee'];
    const mouths = ['smile', 'grin', 'fangs', 'grillz', 'neonSmile', 'rainbowTongue'];
    const beardCells: Array<{ label: string; config: CustomAvatarConfig }> = [];
    for (const b of beards) for (const m of mouths) {
      beardCells.push({ label: `${b}+${m}`, config: { ...DEFAULT_AVATAR_CONFIG, gender: 'male', facialHair: b as never, mouth: m as never } });
    }
    await sheet('conflict-beard-x-mouth', beardCells);

    // wings (back-layer) x back-layer hair
    const wings = ['angelWings', 'demonWings', 'butterflyWings'];
    const backHair = ['long', 'afro', 'wavy', 'spaceBuns'];
    const wingCells: Array<{ label: string; config: CustomAvatarConfig }> = [];
    for (const w of wings) for (const h of backHair) {
      wingCells.push({ label: `${w}+${h}`, config: { ...DEFAULT_AVATAR_CONFIG, accessory: w as never, hair: h as never } });
    }
    await sheet('conflict-wings-x-hair', wingCells);
  }, 120_000);
});
