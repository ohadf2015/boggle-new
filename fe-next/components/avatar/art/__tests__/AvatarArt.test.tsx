// @vitest-environment node
/**
 * Contract for the 2026-09 avatar art (one server-safe compositor).
 * Re-asserts the intents of the retired per-part tests on the new art:
 * every saved id renders, heads read as heads, premium looks premium,
 * static frame = hero frame, ids never collide, PNG export works.
 */
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import AvatarArt from '../AvatarArt';
import { HEADS } from '../heads';
import { DRAWN_IDS } from '../registry';
import { CANONICAL_PARTS, LEGACY_CATEGORIES, mapLegacyPart } from '@/lib/avatar/legacyMap';
import { getPartRarity, getConfigRarity } from '@/lib/avatar/rarity';
import {
  AVATAR_ACCESSORIES, AVATAR_BASES, AVATAR_EYE_STYLES, AVATAR_HAIR_STYLES, AVATAR_MOUTH_STYLES,
  DEFAULT_AVATAR_CONFIG, getSeededAvatarConfig, type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

const svgOf = (cfg: Partial<CustomAvatarConfig>, extra: Record<string, unknown> = {}) =>
  renderToStaticMarkup(
    <AvatarArt config={{ ...DEFAULT_AVATAR_CONFIG, ...cfg } as CustomAvatarConfig} uid="t1" size={128} circular {...extra} />,
  );

describe('art registry', () => {
  it('draws exactly the canonical part set — no missing drawings, no orphan art', () => {
    for (const cat of LEGACY_CATEGORIES) {
      expect([...DRAWN_IDS[cat]].sort(), cat).toEqual([...CANONICAL_PARTS[cat]].sort());
    }
  });
});

describe('AvatarArt render', () => {
  it('renders every enum id of the big categories (old saves included) with no undefined/NaN attributes', () => {
    const lists: [keyof CustomAvatarConfig, readonly string[]][] = [
      ['base', AVATAR_BASES], ['hair', AVATAR_HAIR_STYLES], ['eyes', AVATAR_EYE_STYLES],
      ['mouth', AVATAR_MOUTH_STYLES], ['accessory', AVATAR_ACCESSORIES],
    ];
    for (const [field, ids] of lists) {
      for (const id of ids) {
        const svg = svgOf({ [field]: id });
        expect(svg, `${field}:${id}`).toContain('<svg');
        expect(svg, `${field}:${id}`).not.toMatch(/="(undefined|NaN)"|NaN/);
      }
    }
  });

  it('never repeats a fragment id inside one avatar (clip/gradient collisions blank parts)', () => {
    const configs: Partial<CustomAvatarConfig>[] = [
      { hair: 'galaxy', eyes: 'animeEye', accessory: 'crystalCrown', base: 'dragonHead', facialHair: 'wizardBeard', mouth: 'grillz' },
      { gender: 'female', hair: 'pigtails', eyes: 'thirdEye', accessory: 'butterflyWings', bodyStyle: 'hoodie' },
      ...Array.from({ length: 30 }, (_, i) => getSeededAvatarConfig(i)),
    ];
    for (const cfg of configs) {
      const ids = [...svgOf(cfg).matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
      expect(new Set(ids).size, JSON.stringify(cfg)).toBe(ids.length);
    }
  });

  it('static (SSR/PNG/disableEffects) is not animated; animated opts into the ONE global stylesheet', () => {
    const still = svgOf({ eyes: 'round' });
    expect(still).not.toContain('av-anim');
    expect(still).not.toContain('av-blink');
    const live = svgOf({ eyes: 'round' }, { animated: true });
    expect(live).toMatch(/class="[^"]*\bav-anim\b/);
    expect(live).toContain('class="av-blink"');
  });

  it('never inlines a <style> per avatar (a 50-row leaderboard shipped 50 copies, and CSS leaked into textContent)', () => {
    expect(svgOf({ eyes: 'round' }, { animated: true })).not.toContain('<style');
  });

  it('the global avatar-art stylesheet scopes idle motion to .av-anim and honors reduced motion', () => {
    const css = readFileSync(resolve(__dirname, '../../../../app/avatar-art.css'), 'utf8');
    expect(css).toContain('.av-anim .av-blink');
    expect(css).toContain('@keyframes avBlink');
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
    const globals = readFileSync(resolve(__dirname, '../../../../app/globals.css'), 'utf8');
    expect(globals).toContain("@import './avatar-art.css'");
  });

  it('two avatars get different blink timing (a lobby must not blink in unison)', () => {
    const a = renderToStaticMarkup(<AvatarArt config={DEFAULT_AVATAR_CONFIG} uid="aaa" animated />);
    const b = renderToStaticMarkup(<AvatarArt config={DEFAULT_AVATAR_CONFIG} uid="bbq" animated />);
    const delay = (s: string) => /animation-delay:(-?[\d.]+)s/.exec(s)?.[1];
    expect(delay(a)).toBeDefined();
    expect(delay(a)).not.toBe(delay(b));
  });
});

describe('rarity presentation', () => {
  it('common avatars get no frame; every rarer tier gets its own frame', () => {
    expect(svgOf({})).not.toContain('data-rarity-frame');
    for (const [cfg, tier] of [
      [{ accessory: 'headphones' }, 'rare'],
      [{ accessory: 'frogHat' }, 'epic'],
      [{ accessory: 'crystalCrown' }, 'legendary'],
    ] as const) {
      expect(getConfigRarity({ ...DEFAULT_AVATAR_CONFIG, ...cfg } as CustomAvatarConfig)).toBe(tier);
      const svg = svgOf(cfg);
      expect(svg).toContain(`data-rarity-frame="${tier}"`);
      expect(svg).toContain(`data-rarity="${tier}"`);
    }
  });

  it('epic/legendary sparkles are visible in the static frame (hero frame, not opacity 0 at t=0)', () => {
    const svg = svgOf({ accessory: 'crystalCrown' });
    const sparkles = svg.match(/<path[^>]*class="av-tw"[^>]*>/g) ?? [];
    expect(sparkles.length).toBeGreaterThanOrEqual(4);
    for (const s of sparkles) expect(s).not.toMatch(/opacity="0"/);
  });

  it('every epic/legendary part is made of a material (gradient, glow, flicker or sparkle), not flat paint', () => {
    const flat: string[] = [];
    const fieldOf: Record<string, keyof CustomAvatarConfig> = { base: 'base', hair: 'hair', eyes: 'eyes', mouth: 'mouth', accessory: 'accessory', facialHair: 'facialHair' };
    for (const [cat, field] of Object.entries(fieldOf)) {
      for (const id of CANONICAL_PARTS[cat as keyof typeof CANONICAL_PARTS]) {
        const r = getPartRarity(cat, id);
        if (r !== 'epic' && r !== 'legendary') continue;
        // render the part alone on a common avatar and strip the tier FX
        const svg = renderToStaticMarkup(
          <AvatarArt config={{ ...DEFAULT_AVATAR_CONFIG, [field]: id } as CustomAvatarConfig} uid="m" forceTier="free" />,
        );
        if (!/Gradient|av-glow|av-flicker|av-tw|av-pulse|av-float/.test(svg)) flat.push(`${cat}:${id}`);
      }
    }
    expect(flat).toEqual([]);
  });

  it('every legendary part is a prize on its own: a rich (gradient) material plus at least two twinkles', () => {
    const plain: string[] = [];
    const fieldOf: Record<string, keyof CustomAvatarConfig> = { base: 'base', hair: 'hair', eyes: 'eyes', mouth: 'mouth', accessory: 'accessory', facialHair: 'facialHair' };
    for (const [cat, field] of Object.entries(fieldOf)) {
      for (const id of CANONICAL_PARTS[cat as keyof typeof CANONICAL_PARTS]) {
        if (getPartRarity(cat, id) !== 'legendary') continue;
        const svg = renderToStaticMarkup(
          <AvatarArt config={{ ...DEFAULT_AVATAR_CONFIG, [field]: id } as CustomAvatarConfig} uid="m" forceTier="free" />,
        );
        const twinkles = (svg.match(/class="av-tw"/g) ?? []).length;
        if (!/Gradient/.test(svg) || twinkles < 2) plain.push(`${cat}:${id} (twinkles ${twinkles})`);
      }
    }
    expect(plain).toEqual([]);
  });

  it('a common circular avatar gets an ink token edge (a dark bg still reads as a disc) but no rarity frame', () => {
    const svg = svgOf({ bgColor: '#1a1a2e' });
    expect(svg).toContain('data-token-edge');
    expect(svg).not.toContain('data-rarity-frame');
    // the edge is part of the ring: off when a mode frame owns the border or the ring is disabled
    expect(svgOf({}, { mode: 'multiplayer' })).not.toContain('data-token-edge');
    expect(svgOf({}, { rarityFrame: false })).not.toContain('data-token-edge');
    // rarer tiers draw their own ring instead
    expect(svgOf({ accessory: 'headphones' })).not.toContain('data-token-edge');
  });

  it('mode frame owns the border: no rarity ring, but the mode frame is drawn', () => {
    const svg = svgOf({ accessory: 'crystalCrown' }, { mode: 'multiplayer' });
    expect(svg).toContain('data-mode-frame');
    expect(svg).toContain('data-rarity-frame="legendary"');
    expect(svg.match(/stroke="#FFC928"/g) ?? []).toHaveLength(0);
  });
});

describe('heads read as heads', () => {
  it('every common (human) head has ears and an organic (curved) silhouette', () => {
    for (const id of CANONICAL_PARTS.base) {
      if (getPartRarity('base', id) !== 'common') continue;
      const h = HEADS[id];
      expect(h.d, id).toMatch(/[QA]/);
      if (id !== 'catFace') expect(h.earX, `${id} ears`).not.toBeNull();
    }
  });

  it('dragonHead (legendary) keeps its horns and fins on-canvas', () => {
    // part geometry only (forceTier free: no rarity rays, which run past the frame by design)
    const svg = svgOf({ base: 'dragonHead' }, { forceTier: 'free' });
    const nums = [...svg.matchAll(/d="([^"]+)"/g)].flatMap(m => m[1].match(/-?\d+(\.\d+)?/g)?.map(Number) ?? []);
    expect(Math.min(...nums)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...nums)).toBeLessThanOrEqual(110);
    expect(svg).toContain('#E8413C');
  });
});

describe('legacy ids render as their replacement', () => {
  it('a retired id and its replacement produce the same drawing', () => {
    const a = svgOf({ hair: 'lob' });
    const b = svgOf({ hair: mapLegacyPart('hair', 'lob') as CustomAvatarConfig['hair'] });
    const strip = (s: string) => s.replace(/aria-label="[^"]*"/, '');
    expect(strip(a)).toBe(strip(b));
    expect(getPartRarity('hair', 'lob')).toBe(getPartRarity('hair', 'bob'));
  });

  it('garbage saved configs still render a valid avatar', () => {
    const svg = renderToStaticMarkup(<AvatarArt config={{ base: 'nope', hair: 42 } as unknown as CustomAvatarConfig} uid="g" />);
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/NaN|undefined/);
  });
});

describe('PNG export (Express route path)', () => {
  it('sharp rasterizes a spread of avatars to non-trivial 256px PNGs', async () => {
    const configs: Partial<CustomAvatarConfig>[] = [
      {}, { base: 'dragonHead', accessory: 'phoenixCrown' }, { hair: 'galaxy', eyes: 'galaxy' },
      { gender: 'female', hair: 'milkmaidBraids', mouth: 'lipGloss', accessory: 'keffiyeh' },
      { accessory: 'angelWings', facialHair: 'wizardBeard' },
    ];
    for (const cfg of configs) {
      const svg = renderToStaticMarkup(<AvatarArt config={{ ...DEFAULT_AVATAR_CONFIG, ...cfg } as CustomAvatarConfig} uid="ssr" size={256} circular />);
      const png = await sharp(Buffer.from(svg)).resize(256, 256).png().toBuffer();
      const { width, height } = await sharp(png).metadata();
      expect(width).toBe(256);
      expect(height).toBe(256);
      expect(png.length).toBeGreaterThan(8000);
    }
  });
});

describe('showcase reference set', () => {
  it('each showcase row really is that rarity, with both genders and a skin-tone spread', async () => {
    const { SHOWCASE } = await import('../showcase');
    const all = Object.values(SHOWCASE).flat();
    for (const [tier, configs] of Object.entries(SHOWCASE)) {
      expect(configs.length).toBeGreaterThanOrEqual(5);
      for (const c of configs) expect(getConfigRarity(c), JSON.stringify(c)).toBe(tier);
    }
    expect(new Set(all.map(c => c.gender))).toEqual(new Set(['male', 'female']));
    expect(new Set(all.map(c => c.skinColor)).size).toBeGreaterThanOrEqual(8);
  });

  it('rows are even (same count per tier) and every character is distinct in silhouette and face', async () => {
    const { SHOWCASE } = await import('../showcase');
    const counts = Object.values(SHOWCASE).map(r => r.length);
    expect(new Set(counts).size, `row lengths ${counts}`).toBe(1);
    for (const [tier, row] of Object.entries(SHOWCASE)) {
      expect(new Set(row.map(c => `${c.base}/${c.hair}/${c.accessory}`)).size, tier).toBe(row.length);
      expect(new Set(row.map(c => c.eyes)).size, `${tier} eyes`).toBe(row.length);
      expect(new Set(row.map(c => c.bgColor)).size, `${tier} backgrounds`).toBeGreaterThanOrEqual(row.length - 1);
    }
  });

  it('no showcase background disappears into the navy page', async () => {
    const { SHOWCASE } = await import('../showcase');
    const { luminance } = await import('../kit');
    for (const c of Object.values(SHOWCASE).flat()) {
      expect(luminance(c.bgColor), c.bgColor).toBeGreaterThan(0.2);
    }
  });
});
