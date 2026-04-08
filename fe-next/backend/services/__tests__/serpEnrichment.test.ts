/**
 * Tests for SERP API Trend Enrichment
 * Verifies that trends are enriched with news articles, related searches, and PAA
 */

import { vi, type Mock, type MockInstance } from 'vitest';
import { enrichTrendWithNews, enrichTrendsWithNews, type TrendingTopic } from '../serpApiClient';

// Mock ky — vi.hoisted() ensures mockGet is available when the hoisted vi.mock() runs
const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));
vi.mock('ky', () => ({
  default: { get: mockGet },
}));

describe('SERP API Trend Enrichment', () => {
  const mockTrend: TrendingTopic = {
    query: 'AI Revolution',
    search_volume: 500000,
    active: true,
    categories: [{ id: 5, name: 'Technology' }],
    trend_breakdown: ['artificial intelligence', 'machine learning', 'neural networks'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SERPAPI_KEY = 'test-api-key';
  });

  afterEach(() => {
    delete process.env.SERPAPI_KEY;
  });

  describe('enrichTrendWithNews', () => {
    it('should enrich trend with news articles, related searches, and PAA', async () => {
      // Mock Google News response
      mockGet.mockReturnValueOnce({
        json: () => Promise.resolve({
          news_results: [
            {
              title: 'AI Breakthrough in Healthcare',
              link: 'https://example.com/ai-healthcare',
              source: { name: 'TechCrunch' },
              snippet: 'New AI system detects diseases...',
              date: '2026-02-02',
            },
            {
              title: 'OpenAI Launches New Model',
              link: 'https://example.com/openai',
              source: { name: 'The Verge' },
              snippet: 'Latest language model announced...',
            },
          ],
        }),
      });

      // Mock Google Search response (related searches & PAA)
      mockGet.mockReturnValueOnce({
        json: () => Promise.resolve({
          related_searches: [
            { query: 'what is artificial intelligence' },
            { query: 'AI tools 2026' },
            { query: 'machine learning tutorial' },
          ],
          related_questions: [
            { question: 'How does AI work?' },
            { question: 'Is AI dangerous?' },
          ],
        }),
      });

      const enriched = await enrichTrendWithNews(mockTrend, 'en', 3);

      expect(enriched.news_articles).toBeDefined();
      expect(enriched.news_articles).toHaveLength(2);
      expect(enriched.news_articles![0].title).toBe('AI Breakthrough in Healthcare');
      expect(enriched.news_articles![0].source).toBe('TechCrunch');

      expect(enriched.related_searches).toBeDefined();
      expect(enriched.related_searches).toHaveLength(3);
      expect(enriched.related_searches![0]).toBe('what is artificial intelligence');

      expect(enriched.people_also_ask).toBeDefined();
      expect(enriched.people_also_ask).toHaveLength(2);
      expect(enriched.people_also_ask![0]).toBe('How does AI work?');

      expect(enriched.enriched_at).toBeDefined();
    });

    it('should handle API errors gracefully and return original trend', async () => {
      mockGet.mockReturnValue({ json: () => Promise.reject(new Error('API Error')) });

      const enriched = await enrichTrendWithNews(mockTrend, 'en', 3);

      // Should return original trend without enrichment
      expect(enriched.news_articles).toBeUndefined();
      expect(enriched.related_searches).toBeUndefined();
      expect(enriched.people_also_ask).toBeUndefined();
      expect(enriched.query).toBe(mockTrend.query);
    });

    it('should handle empty news results', async () => {
      mockGet.mockReturnValueOnce({ json: () => Promise.resolve({ news_results: [] }) });
      mockGet.mockReturnValueOnce({ json: () => Promise.resolve({}) });

      const enriched = await enrichTrendWithNews(mockTrend, 'en', 3);

      expect(enriched.news_articles).toEqual([]);
      expect(enriched.related_searches).toEqual([]);
      expect(enriched.people_also_ask).toEqual([]);
    });
  });

  describe('enrichTrendsWithNews', () => {
    it('should skip enrichment when SERPAPI_KEY is not set', async () => {
      delete process.env.SERPAPI_KEY;

      const trends = [mockTrend];
      const enriched = await enrichTrendsWithNews(trends, 'en', 5);

      expect(enriched).toEqual(trends);
      expect(mockGet).not.toHaveBeenCalled();
    });

    it('should only enrich top N trends to save API quota', async () => {
      const trends = Array.from({ length: 10 }, (_, i) => ({
        ...mockTrend,
        query: `Trend ${i + 1}`,
      }));

      mockGet.mockReturnValue({ json: () => Promise.resolve({}) });

      const enriched = await enrichTrendsWithNews(trends, 'en', 3);

      expect(enriched).toHaveLength(10);
      // Should call API 6 times (3 trends × 2 endpoints each)
      expect(mockGet).toHaveBeenCalledTimes(6);
    });

    it('should add delays between API calls to avoid rate limiting', async () => {
      vi.useFakeTimers();

      const trends = [
        { ...mockTrend, query: 'Trend 1' },
        { ...mockTrend, query: 'Trend 2' },
      ];

      mockGet.mockReturnValue({ json: () => Promise.resolve({}) });

      const enrichPromise = enrichTrendsWithNews(trends, 'en', 2);

      // Fast-forward through delays
      await vi.runAllTimersAsync();

      const enriched = await enrichPromise;

      expect(enriched).toHaveLength(2);

      vi.useRealTimers();
    });
  });
});
