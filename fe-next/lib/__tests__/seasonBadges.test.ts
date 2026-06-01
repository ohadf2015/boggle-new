import { describe, it, expect } from 'vitest';
import {
  getRankBadge,
  isTopFiveRank,
  rankBadgeRarity,
  rankTitleKey,
  seasonBadgeImagePath,
  SEASON_BADGE_MAX_RANK,
} from '../seasonBadges';

describe('seasonBadges registry', () => {
  describe('isTopFiveRank', () => {
    it('returns true for ranks 1-5', () => {
      [1, 2, 3, 4, 5].forEach((r) => expect(isTopFiveRank(r)).toBe(true));
    });

    it('returns false for ranks > 5 or <= 0 or undefined', () => {
      expect(isTopFiveRank(0)).toBe(false);
      expect(isTopFiveRank(6)).toBe(false);
      expect(isTopFiveRank(undefined)).toBe(false);
      expect(isTopFiveRank(-1)).toBe(false);
    });

    it('exposes SEASON_BADGE_MAX_RANK = 5', () => {
      expect(SEASON_BADGE_MAX_RANK).toBe(5);
    });
  });

  describe('seasonBadgeImagePath', () => {
    it('builds /badges/season-{n}-rank-{k}.png', () => {
      expect(seasonBadgeImagePath(1, 1)).toBe('/badges/season-1-rank-1.png');
      expect(seasonBadgeImagePath(7, 5)).toBe('/badges/season-7-rank-5.png');
    });
  });

  describe('rankTitleKey', () => {
    it('maps 1-5 to distinct keys', () => {
      expect(rankTitleKey(1)).toBe('seasonBadges.title.rank1');
      expect(rankTitleKey(2)).toBe('seasonBadges.title.rank2');
      expect(rankTitleKey(3)).toBe('seasonBadges.title.rank3');
      expect(rankTitleKey(4)).toBe('seasonBadges.title.rank4');
      expect(rankTitleKey(5)).toBe('seasonBadges.title.rank5');
    });
  });

  describe('rankBadgeRarity', () => {
    it('rank 1 = legendary', () => expect(rankBadgeRarity(1)).toBe('legendary'));
    it('rank 2 = epic', () => expect(rankBadgeRarity(2)).toBe('epic'));
    it('rank 3 = rare', () => expect(rankBadgeRarity(3)).toBe('rare'));
    it('rank 4-5 = uncommon', () => {
      expect(rankBadgeRarity(4)).toBe('uncommon');
      expect(rankBadgeRarity(5)).toBe('uncommon');
    });
  });

  describe('getRankBadge', () => {
    it('returns full metadata for rank 1 of season 1', () => {
      const badge = getRankBadge(1, 1);
      expect(badge).toMatchObject({
        seasonId: 1,
        rank: 1,
        titleKey: 'seasonBadges.title.rank1',
        imagePath: '/badges/season-1-rank-1.png',
        rarity: 'legendary',
      });
      expect(badge?.accentColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(typeof badge?.theme).toBe('string');
    });

    it('returns null for ranks > 5', () => {
      expect(getRankBadge(1, 6)).toBeNull();
      expect(getRankBadge(1, 0)).toBeNull();
    });

    it('cycles theme through the 12-season catalog (s7 distinct from s1, wraps at 12)', () => {
      const s1 = getRankBadge(1, 1);
      const s7 = getRankBadge(7, 1);
      const s13 = getRankBadge(13, 1);
      expect(s7?.theme).not.toBe(s1?.theme); // 7 is its own identity now (Frost Lexicon)
      expect(s13?.theme).toBe(s1?.theme); // wraps after 12
    });
  });
});
