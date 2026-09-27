import { describe, it, expect } from 'vitest';
import { DEFAULT_AVATAR_CONFIG, type CustomAvatarConfig } from '@/shared/types/customAvatar';
import { LEVEL_UNLOCK_LADDER } from '@/lib/avatar/unlocks';
import {
  getProfileTitleId,
  getStageTheme,
  getRarestEquipped,
  getHeadlineStats,
  pickPinnedAchievements,
  parseProfileViewSource,
  buildProfileShareUrl,
  friendlyDisplayName,
  getNextUnlock,
} from '../profileShowcaseModel';

const cfg = (over: Partial<CustomAvatarConfig>): CustomAvatarConfig =>
  ({ ...DEFAULT_AVATAR_CONFIG, ...over }) as CustomAvatarConfig;

describe('getProfileTitleId', () => {
  it('Given level bands, When resolved, Then titles climb with level', () => {
    expect(getProfileTitleId(1)).toBe('rookie');
    expect(getProfileTitleId(2)).toBe('rookie');
    expect(getProfileTitleId(3)).toBe('hunter');
    expect(getProfileTitleId(7)).toBe('wordsmith');
    expect(getProfileTitleId(15)).toBe('lexicon');
    expect(getProfileTitleId(30)).toBe('legend');
    expect(getProfileTitleId(99)).toBe('legend');
  });

  it('Given garbage, When resolved, Then falls back to rookie', () => {
    expect(getProfileTitleId(Number.NaN)).toBe('rookie');
    expect(getProfileTitleId(-4)).toBe('rookie');
  });
});

describe('getStageTheme', () => {
  it('Given rarities, When themed, Then star count rises with rarity', () => {
    const stars = (['common', 'rare', 'epic', 'legendary'] as const).map(r => getStageTheme(r).stars);
    expect(stars).toEqual([1, 2, 3, 4]);
  });

  it('Given each rarity, Then exposes hex colors for the backdrop', () => {
    for (const r of ['common', 'rare', 'epic', 'legendary'] as const) {
      const theme = getStageTheme(r);
      expect(theme.from).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.to).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('getRarestEquipped', () => {
  it('Given an all-common avatar, Then there is nothing to highlight', () => {
    expect(getRarestEquipped(DEFAULT_AVATAR_CONFIG as CustomAvatarConfig)).toBeNull();
    expect(getRarestEquipped(null)).toBeNull();
  });

  it('Given a level-unlocked epic + rare part, Then the epic one wins', () => {
    // heartEye is the first epic on the ladder; headphones is rare.
    const heart = LEVEL_UNLOCK_LADDER.find(u => u.partId === 'heartEye');
    const phones = LEVEL_UNLOCK_LADDER.find(u => u.partId === 'headphones');
    expect(heart?.rarity).toBe('epic');
    expect(phones?.rarity).toBe('rare');
    const pick = getRarestEquipped(cfg({ eyes: 'heartEye', accessory: 'headphones' } as Partial<CustomAvatarConfig>));
    expect(pick).toEqual({ category: 'eyes', partId: 'heartEye', rarity: 'epic' });
  });

  it('Given a single rare part, Then it is highlighted with its category', () => {
    const pick = getRarestEquipped(cfg({ accessory: 'headphones' } as Partial<CustomAvatarConfig>));
    expect(pick).toEqual({ category: 'accessory', partId: 'headphones', rarity: 'rare' });
  });
});

describe('getHeadlineStats', () => {
  it('Given a brand-new player, Then no empty/zero tiles are produced', () => {
    expect(getHeadlineStats({ longestWord: null, wins: 0, streak: 0, games: 0 })).toEqual([]);
  });

  it('Given a veteran, Then shows best word, wins, streak, games in order, capped at 4', () => {
    const stats = getHeadlineStats({ longestWord: 'QUIXOTIC', wins: 12, streak: 5, games: 40, winRate: 30 });
    expect(stats.map(s => s.id)).toEqual(['bestWord', 'wins', 'streak', 'games']);
    expect(stats[0].value).toBe('QUIXOTIC');
    expect(stats[1].value).toBe(12);
  });

  it('Given a public profile (no streak), Then win rate fills the slot', () => {
    const stats = getHeadlineStats({ longestWord: 'CAT', wins: 3, games: 10, winRate: 30 });
    expect(stats.map(s => s.id)).toEqual(['bestWord', 'wins', 'games', 'winRate']);
  });

  it('Given only games played, Then only that tile appears', () => {
    expect(getHeadlineStats({ games: 2, wins: 0 }).map(s => s.id)).toEqual(['games']);
  });
});

describe('pickPinnedAchievements', () => {
  it('Given no counts, Then nothing is pinned', () => {
    expect(pickPinnedAchievements(null)).toEqual([]);
    expect(pickPinnedAchievements({ a: 0 })).toEqual([]);
  });

  it('Given counts, Then Hall-of-Fame first, then highest count, capped', () => {
    const pinned = pickPinnedAchievements({ SPEEDSTER: 2, WORDSMITH: 9, FIRST_WORD: 1, RARE_GEM: 1 }, 3);
    expect(pinned.map(p => p.key)).toEqual(['RARE_GEM', 'WORDSMITH', 'SPEEDSTER']);
    expect(pinned[1].count).toBe(9);
  });

  it('Given ties, Then order is stable by key', () => {
    expect(pickPinnedAchievements({ B: 1, A: 1 }).map(p => p.key)).toEqual(['A', 'B']);
  });
});

describe('parseProfileViewSource', () => {
  it('Given ?from=header, Then source is header', () => {
    expect(parseProfileViewSource('?from=header')).toBe('header');
    expect(parseProfileViewSource('from=post_game&x=1')).toBe('post_game');
  });

  it('Given nothing or junk, Then source is direct', () => {
    expect(parseProfileViewSource('')).toBe('direct');
    expect(parseProfileViewSource(null)).toBe('direct');
    expect(parseProfileViewSource('?from=<script>')).toBe('direct');
    expect(parseProfileViewSource(`?from=${'a'.repeat(60)}`)).toBe('direct');
  });
});

describe('buildProfileShareUrl', () => {
  it('Given a username, Then builds the locale public profile URL', () => {
    expect(buildProfileShareUrl('https://lexiclash.live', 'he', 'ron')).toBe('https://lexiclash.live/he/u/ron');
  });

  it('Given unsafe chars and a trailing slash, Then encodes and normalises', () => {
    expect(buildProfileShareUrl('https://x.io/', 'en', 'a b')).toBe('https://x.io/en/u/a%20b');
  });

  it('Given no locale, Then defaults to en', () => {
    expect(buildProfileShareUrl('https://x.io', undefined, 'ron')).toBe('https://x.io/en/u/ron');
  });
});

describe('friendlyDisplayName', () => {
  it('Given a real display name, Then uses it', () => {
    expect(friendlyDisplayName('Ron', 'Player_ab12cd')).toEqual({ name: 'Ron', isPlaceholder: false });
  });

  it('Given only an auto-generated username, Then flags it as a placeholder', () => {
    expect(friendlyDisplayName(null, 'Player_ab12cd34')).toEqual({ name: '', isPlaceholder: true });
    expect(friendlyDisplayName('Player_ab12cd34', 'Player_ab12cd34')).toEqual({ name: '', isPlaceholder: true });
  });

  it('Given a chosen username only, Then uses it', () => {
    expect(friendlyDisplayName('', 'wordwizard')).toEqual({ name: 'wordwizard', isPlaceholder: false });
  });
});

describe('getNextUnlock', () => {
  it('Given level 1, Then the level-2 unlock is next', () => {
    expect(getNextUnlock(1)).toMatchObject({ level: 2 });
  });

  it('Given a level past the ladder, Then null', () => {
    expect(getNextUnlock(999)).toBeNull();
  });
});
