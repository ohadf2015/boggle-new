// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AvatarRenderer from '../../AvatarRenderer';
import AvatarRendererSsr from '../../AvatarRendererSsr';
import { ACC_HOLIDAY } from '../accessoriesHoliday';
import { ACCESSORIES } from '../registry';
import { getCatalogPart } from '@/lib/avatar/catalog';
import { COLLECTIBLE_PART_KEYS, isPartUsable } from '@/lib/avatar/unlocks';
import { getPartLockInfo } from '@/components/avatar/editor/partLock';
import { HOLIDAY_ALL_PART_KEYS } from '@/lib/holidayEvent/rewards';
import {
  AVATAR_ACCESSORIES, DEFAULT_AVATAR_CONFIG, HOLIDAY_PARTS, customAvatarSchema, isHolidayPart, isPremiumPart,
  type CustomAvatarConfig,
} from '@/shared/types/customAvatar';

const IDS = ['beanieBlue', 'scarfBlue', 'dreidelPin', 'menorahCrown', 'santaHat', 'elfHat', 'antlers', 'earmuffs', 'scarfXmas', 'candyGlasses',
  'goldDreidelPin', 'goldOrnament', 'goldGeltMedal', 'goldBell'];
const cfg = (accessory: string) => ({ ...DEFAULT_AVATAR_CONFIG, accessory } as CustomAvatarConfig);

describe('holiday avatar accessories', () => {
  it('Given the holiday ids, then each is drawn, in the enum, and a saved config with it validates', () => {
    expect(Object.keys(ACC_HOLIDAY).sort()).toEqual([...IDS].sort());
    for (const id of IDS) {
      expect(AVATAR_ACCESSORIES as readonly string[], id).toContain(id);
      expect(ACCESSORIES[id], id).toBe(ACC_HOLIDAY[id]);
      expect(customAvatarSchema.safeParse(cfg(id)).success, id).toBe(true);
    }
  });

  it('Given each holiday part, when rendered by AvatarRenderer and AvatarRendererSsr, then the art differs from no accessory', () => {
    const bareClient = renderToStaticMarkup(<AvatarRenderer config={cfg('none')} disableEffects />);
    const bareSsr = renderToStaticMarkup(<AvatarRendererSsr config={cfg('none')} />);
    for (const id of IDS) {
      const client = renderToStaticMarkup(<AvatarRenderer config={cfg(id)} disableEffects />);
      const ssr = renderToStaticMarkup(<AvatarRendererSsr config={cfg(id)} />);
      expect(client, id).not.toBe(bareClient);
      expect(ssr, id).not.toBe(bareSsr);
      expect(ssr, id).not.toMatch(/="(undefined|NaN)"|NaN/);
    }
  });

  it('Given the menorah crown, then it has exactly 9 candles: 4, a raised shamash, 4', () => {
    const svg = renderToStaticMarkup(<AvatarRendererSsr config={cfg('menorahCrown')} />);
    const candles = [...svg.matchAll(/data-candle="(\w+)"[^>]*\sy="([\d.]+)"/g)].map((m) => ({ kind: m[1], y: Number(m[2]) }));
    expect(candles).toHaveLength(9);
    const shamash = candles.filter((c) => c.kind === 'shamash');
    expect(shamash).toHaveLength(1);
    expect(candles.indexOf(shamash[0])).toBe(4);
    for (const c of candles) if (c.kind !== 'shamash') expect(shamash[0].y).toBeLessThan(c.y);
  });

  it('Given holiday parts, then they are earned only: locked unless owned, never priced, never in chests', () => {
    expect([...HOLIDAY_PARTS].sort()).toEqual([...HOLIDAY_ALL_PART_KEYS].sort());
    for (const id of IDS) {
      expect(isHolidayPart('accessory', id)).toBe(true);
      expect(isPremiumPart('accessory', id)).toBe(true);
      expect(getCatalogPart('accessory', id)?.price, id).toBeNull();
      expect(isPartUsable('accessory', id, { ownedKeys: [], level: 99 })).toBe(false);
      expect(isPartUsable('accessory', id, { ownedKeys: [`accessory:${id}`], level: 1 })).toBe(true);
      expect(COLLECTIBLE_PART_KEYS).not.toContain(`accessory:${id}`);
      const premium = { isPartUnlocked: () => false, coins: 1_000_000, level: 99 };
      expect(getPartLockInfo('accessory', id, premium).path).toBe('holiday');
    }
  });
});
