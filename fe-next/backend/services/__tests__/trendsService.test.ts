/**
 * Tests for Trends Service
 * Validates trend filtering and selection logic for Daily Buzz
 */

import {
  filterTrends,
  selectTrendsForChallenge,
  isSportsRelatedTrend,
  getFallbackTopics,
} from '../buzz/trendsService';
import type { TrendingTopic } from '../serpApiClient';

describe('Trends Service', () => {
  describe('selectTrendsForChallenge', () => {
    it('should select at least 7 trends when enough are available for better AI generation', () => {
      // GIVEN: 10 diverse trending topics with different categories
      const trends: TrendingTopic[] = [
        { query: 'Technology News', search_volume: 100000, active: true, increase_percentage: 500, categories: [{ id: 1, name: 'Technology' }] },
        { query: 'Climate Summit', search_volume: 80000, active: true, increase_percentage: 400, categories: [{ id: 2, name: 'Climate' }] },
        { query: 'Music Awards', search_volume: 90000, active: true, increase_percentage: 300, categories: [{ id: 3, name: 'Entertainment' }] },
        { query: 'Travel Tips', search_volume: 70000, active: true, increase_percentage: 200, categories: [{ id: 4, name: 'Travel and Transportation' }] },
        { query: 'Health Study', search_volume: 60000, active: true, increase_percentage: 150, categories: [{ id: 5, name: 'Health' }] },
        { query: 'Fashion Week', search_volume: 50000, active: true, increase_percentage: 100, categories: [{ id: 6, name: 'Other' }] },
        { query: 'Food Festival', search_volume: 40000, active: true, increase_percentage: 80, categories: [{ id: 7, name: 'Food' }] },
        { query: 'Art Exhibition', search_volume: 30000, active: true, increase_percentage: 60, categories: [{ id: 8, name: 'Other' }] },
        { query: 'Book Release', search_volume: 20000, active: true, increase_percentage: 40, categories: [{ id: 9, name: 'Entertainment' }] },
        { query: 'Science Discovery', search_volume: 10000, active: true, increase_percentage: 20, categories: [{ id: 10, name: 'Science' }] },
      ];

      // WHEN: Selecting trends for challenge generation
      const selected = selectTrendsForChallenge(trends);

      // THEN: Should select at least 7 trends to give AI more material
      // This ensures better challenge generation when AI fails to use all trends
      expect(selected.length).toBeGreaterThanOrEqual(7);
    });

    it('should return all trends when fewer than 7 are available', () => {
      // GIVEN: Only 5 trending topics
      const trends: TrendingTopic[] = [
        { query: 'Trend 1', search_volume: 100000, active: true, categories: [{ id: 1, name: 'Tech' }] },
        { query: 'Trend 2', search_volume: 80000, active: true, categories: [{ id: 2, name: 'Climate' }] },
        { query: 'Trend 3', search_volume: 60000, active: true, categories: [{ id: 3, name: 'Entertainment' }] },
        { query: 'Trend 4', search_volume: 40000, active: true, categories: [{ id: 4, name: 'Travel' }] },
        { query: 'Trend 5', search_volume: 20000, active: true, categories: [{ id: 5, name: 'Health' }] },
      ];

      // WHEN: Selecting trends
      const selected = selectTrendsForChallenge(trends);

      // THEN: Should return all available trends
      expect(selected.length).toBe(5);
    });

    it('should prioritize rising trends with higher increase_percentage', () => {
      // GIVEN: Trends with varying increase percentages (all non-sports same category type)
      const trends: TrendingTopic[] = [
        { query: 'Slow Trend', search_volume: 100000, active: true, increase_percentage: 10, categories: [{ id: 1, name: 'Tech' }] },
        { query: 'Fast Rising', search_volume: 50000, active: true, increase_percentage: 500, categories: [{ id: 2, name: 'News' }] },
        { query: 'Medium Rise', search_volume: 70000, active: true, increase_percentage: 200, categories: [{ id: 3, name: 'Entertainment' }] },
        { query: 'Another Fast', search_volume: 30000, active: true, increase_percentage: 400, categories: [{ id: 4, name: 'Climate' }] },
        { query: 'Steady Trend', search_volume: 80000, active: true, increase_percentage: 50, categories: [{ id: 5, name: 'Health' }] },
        { query: 'Hot Topic', search_volume: 40000, active: true, increase_percentage: 600, categories: [{ id: 6, name: 'Other' }] },
        { query: 'Warm Trend', search_volume: 60000, active: true, increase_percentage: 300, categories: [{ id: 7, name: 'Science' }] },
        { query: 'Cool Topic', search_volume: 20000, active: true, increase_percentage: 150, categories: [{ id: 8, name: 'Travel' }] },
      ];

      // WHEN: Selecting trends
      const selected = selectTrendsForChallenge(trends);

      // THEN: First few should be from the fastest rising trends (>100%)
      // Note: order depends on category limits (MAX_PER_CATEGORY = 2)
      const fastestRising = selected.slice(0, 5).map(t => t.increase_percentage ?? 0);
      expect(Math.max(...fastestRising)).toBeGreaterThanOrEqual(400);
      // All fastest rising trends should be included
      expect(selected.some(t => t.query === 'Hot Topic')).toBe(true);
      expect(selected.some(t => t.query === 'Fast Rising')).toBe(true);
    });

    it('should limit sports trends in the selected set', () => {
      // GIVEN: Multiple sports trends mixed with other topics
      const trends: TrendingTopic[] = [
        { query: 'Football Match', search_volume: 100000, active: true, increase_percentage: 500, categories: [{ id: 1, name: 'Sports' }] },
        { query: 'Basketball Game', search_volume: 90000, active: true, increase_percentage: 400, categories: [{ id: 2, name: 'Sports' }] },
        { query: 'Tech News', search_volume: 80000, active: true, increase_percentage: 300, categories: [{ id: 3, name: 'Technology' }] },
        { query: 'Climate Report', search_volume: 70000, active: true, increase_percentage: 200, categories: [{ id: 4, name: 'Climate' }] },
        { query: 'Movie Release', search_volume: 60000, active: true, increase_percentage: 150, categories: [{ id: 5, name: 'Entertainment' }] },
        { query: 'Health Study', search_volume: 50000, active: true, increase_percentage: 100, categories: [{ id: 6, name: 'Health' }] },
        { query: 'Soccer World Cup', search_volume: 40000, active: true, increase_percentage: 80, categories: [{ id: 7, name: 'Sports' }] },
        { query: 'Art Show', search_volume: 30000, active: true, increase_percentage: 60, categories: [{ id: 8, name: 'Other' }] },
      ];

      // WHEN: Selecting trends
      const selected = selectTrendsForChallenge(trends);

      // THEN: Should have sports trends limited by MAX_SPORTS (1) and MAX_PER_CATEGORY (2)
      const sportsTrends = selected.filter(t =>
        t.categories?.some(c => c.name.toLowerCase().includes('sports'))
      );
      // With category limit of 2 per category, we might get up to 2 sports if slots remain
      expect(sportsTrends.length).toBeLessThanOrEqual(2);
      // Most importantly, non-sports trends should dominate
      expect(selected.length - sportsTrends.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('isSportsRelatedTrend', () => {
    it('should detect Hebrew sports trends using Hebrew keywords', () => {
      // These contain actual Hebrew sports keywords from the constants
      expect(isSportsRelatedTrend('מכבי תל אביב משחק הערב', 'he')).toBe(true);
      expect(isSportsRelatedTrend('הפועל חולון נגד לה מאן', 'he')).toBe(true); // Contains הפועל
      expect(isSportsRelatedTrend('ליגת האלופות הערב', 'he')).toBe(true);
    });

    it('should detect English sports trends', () => {
      expect(isSportsRelatedTrend('celtics basketball game', 'en')).toBe(true); // basketball
      expect(isSportsRelatedTrend('super bowl', 'en')).toBe(true);
      expect(isSportsRelatedTrend('nba finals', 'en')).toBe(true);
    });

    it('should not flag non-sports trends', () => {
      expect(isSportsRelatedTrend('technology news', 'en')).toBe(false);
      expect(isSportsRelatedTrend('חדשות טכנולוגיה', 'he')).toBe(false);
    });
  });

  describe('filterTrends', () => {
    it('should filter out trends that do not match language script', () => {
      // GIVEN: Mixed script trends for Hebrew
      const trends: TrendingTopic[] = [
        { query: 'חדשות ישראל', search_volume: 100000, active: true, categories: [] },
        { query: 'الطقس غدًا', search_volume: 80000, active: true, categories: [] }, // Arabic
        { query: 'טכנולוגיה', search_volume: 60000, active: true, categories: [] },
      ];

      // WHEN: Filtering for Hebrew
      const filtered = filterTrends(trends, 'he');

      // THEN: Should only include Hebrew trends
      expect(filtered.length).toBe(2);
      expect(filtered.every(t => !t.query.includes('الطقس'))).toBe(true);
    });

    it('should filter out recently used trends', () => {
      // GIVEN: Trends including some that were recently used
      const trends: TrendingTopic[] = [
        { query: 'new topic', search_volume: 100000, active: true, categories: [] },
        { query: 'old topic', search_volume: 80000, active: true, categories: [] },
        { query: 'another new', search_volume: 60000, active: true, categories: [] },
      ];
      const recentlyUsed = new Set(['old topic']);

      // WHEN: Filtering with recently used set
      const filtered = filterTrends(trends, 'en', recentlyUsed);

      // THEN: Should exclude the recently used trend
      expect(filtered.some(t => t.query === 'old topic')).toBe(false);
    });

    it('should limit sports trends in filter', () => {
      // GIVEN: Many sports trends
      const trends: TrendingTopic[] = [
        { query: 'football match', search_volume: 100000, active: true, increase_percentage: 500, categories: [{ id: 1, name: 'Sports' }] },
        { query: 'basketball game', search_volume: 90000, active: true, increase_percentage: 400, categories: [{ id: 2, name: 'Sports' }] },
        { query: 'tennis final', search_volume: 80000, active: true, increase_percentage: 300, categories: [{ id: 3, name: 'Sports' }] },
        { query: 'tech news', search_volume: 70000, active: true, increase_percentage: 200, categories: [{ id: 4, name: 'Technology' }] },
      ];

      // WHEN: Filtering
      const filtered = filterTrends(trends, 'en');

      // THEN: Should have limited sports trends (MAX_SPORTS_IN_FILTER = 1)
      const sportsTrends = filtered.filter(t =>
        t.categories?.some(c => c.name.toLowerCase().includes('sports'))
      );
      expect(sportsTrends.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getFallbackTopics', () => {
    it('should return fallback topics for any language', () => {
      const fallbacks = getFallbackTopics('en');

      expect(fallbacks.length).toBeGreaterThan(0);
      expect(fallbacks[0]).toHaveProperty('query');
      expect(fallbacks[0]).toHaveProperty('search_volume');
    });
  });
});
