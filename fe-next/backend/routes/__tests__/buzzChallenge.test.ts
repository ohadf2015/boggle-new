/**
 * Tests for Daily Buzz Challenge API Routes
 * Specifically testing response format transformation from snake_case to camelCase
 */

import request from 'supertest';
import express from 'express';
import buzzRoutes from '../buzzChallenge';

// Mock the buzzGenerator module
jest.mock('../../services/buzzGenerator', () => ({
  getDailyBuzz: jest.fn(),
  generateDailyBuzz: jest.fn(),
}));

// Mock the serpApiClient module
jest.mock('../../services/serpApiClient', () => ({
  fetchGoogleTrends: jest.fn(),
}));

import { getDailyBuzz, generateDailyBuzz } from '../../services/buzzGenerator';

const mockGetDailyBuzz = getDailyBuzz as jest.MockedFunction<typeof getDailyBuzz>;
const mockGenerateDailyBuzz = generateDailyBuzz as jest.MockedFunction<typeof generateDailyBuzz>;

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api', buzzRoutes);

describe('Buzz Challenge API - Response Format', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/buzz/:date/:language', () => {
    it('should transform snake_case database fields to camelCase for frontend', async () => {
      // Mock database response with snake_case (as stored in Supabase)
      const mockDbResponse = {
        id: 1,
        puzzle_date: '2026-01-13',
        language: 'en',
        region: 'US',
        trending_summary: 'Top trends: Technology, Sports',
        trending_topics: [
          { query: 'Technology', search_volume: 100000 },
          { query: 'Sports', search_volume: 80000 },
          { query: 'Music', search_volume: 60000 },
        ],
        challenges: [
          {
            type: 'anagram',
            trend_topic: 'Technology',
            prompt: 'Solve: CHTE | Letters: TECH',
            answer: 'TECH',
            hint: 'Innovation',
            difficulty: 'easy',
            trending_context: 'Tech news today',
          },
        ],
        ai_model: 'gemini-3.0-pro',
        image_url: null,
      };

      mockGetDailyBuzz.mockResolvedValue(mockDbResponse as any);

      const response = await request(app).get('/api/buzz/2026-01-13/en');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Frontend expects camelCase keys
      const data = response.body.data;

      // These should be camelCase for the frontend
      expect(data.puzzleDate).toBe('2026-01-13');
      expect(data.trendingSummary).toBe('Top trends: Technology, Sports');
      expect(data.trendingTopics).toBeDefined();
      expect(Array.isArray(data.trendingTopics)).toBe(true);
      expect(data.trendingTopics.length).toBe(3);
      expect(data.trendingTopics[0].query).toBe('Technology');

      // snake_case keys should NOT exist in response
      expect(data.puzzle_date).toBeUndefined();
      expect(data.trending_summary).toBeUndefined();
      expect(data.trending_topics).toBeUndefined();
    });

    it('should return error for invalid date format', async () => {
      const response = await request(app).get('/api/buzz/invalid-date/en');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid date format');
    });

    it('should return error for unsupported language', async () => {
      const response = await request(app).get('/api/buzz/2026-01-13/fr');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Unsupported language');
    });

    it('should generate challenge if not found in database', async () => {
      mockGetDailyBuzz.mockResolvedValue(null);

      const mockGeneratedResponse = {
        puzzle_date: '2026-01-13',
        language: 'en',
        region: 'US',
        trending_summary: 'Generated trends',
        trending_topics: [{ query: 'Test', search_volume: 1000 }],
        challenges: [],
        ai_model: 'gemini-3.0-pro',
        image_url: null,
      };

      mockGenerateDailyBuzz.mockResolvedValue(mockGeneratedResponse as any);

      const response = await request(app).get('/api/buzz/2026-01-13/en');

      expect(response.status).toBe(200);
      expect(mockGenerateDailyBuzz).toHaveBeenCalled();

      // Should still transform to camelCase
      expect(response.body.data.puzzleDate).toBe('2026-01-13');
      expect(response.body.data.trendingSummary).toBe('Generated trends');
    });
  });
});
