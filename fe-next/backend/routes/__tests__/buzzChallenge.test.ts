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

      // Challenge type should be mapped from backend to frontend format
      // Backend: 'anagram' -> Frontend: 'scrambled'
      expect(data.challenges[0].type).toBe('scrambled');

      // snake_case keys should NOT exist in response
      expect(data.puzzle_date).toBeUndefined();
      expect(data.trending_summary).toBeUndefined();
      expect(data.trending_topics).toBeUndefined();
    });

    it('should map all backend challenge types to frontend types', async () => {
      // Mock database response with all backend challenge types
      const mockDbResponse = {
        id: 1,
        puzzle_date: '2026-01-13',
        language: 'en',
        region: 'US',
        trending_summary: 'Test all types',
        trending_topics: [{ query: 'Test', search_volume: 1000 }],
        challenges: [
          { type: 'anagram', trend_topic: 'Test', prompt: 'p1', answer: 'a1', difficulty: 'easy', trending_context: 'c1' },
          { type: 'fill_blank', trend_topic: 'Test', prompt: 'p2', answer: 'a2', difficulty: 'easy', trending_context: 'c2' },
          { type: 'word_chain', trend_topic: 'Test', prompt: 'p3', answer: 'a3', difficulty: 'easy', trending_context: 'c3' },
          { type: 'definition_match', trend_topic: 'Test', prompt: 'p4', answer: 'a4', difficulty: 'easy', trending_context: 'c4', options: ['a', 'b', 'c', 'd'] },
          { type: 'trending_trio', trend_topic: 'Test', prompt: 'p5', answer: 'a5', difficulty: 'easy', trending_context: 'c5' },
          { type: 'riddle', trend_topic: 'Test', prompt: 'p6', answer: 'a6', difficulty: 'easy', trending_context: 'c6' },
        ],
        ai_model: 'gemini-3.0-pro',
        image_url: null,
      };

      mockGetDailyBuzz.mockResolvedValue(mockDbResponse as any);

      const response = await request(app).get('/api/buzz/2026-01-13/en');

      expect(response.status).toBe(200);
      const challenges = response.body.data.challenges;

      // Verify all types are mapped correctly
      expect(challenges[0].type).toBe('scrambled');  // anagram -> scrambled
      expect(challenges[1].type).toBe('fillBlank');  // fill_blank -> fillBlank
      expect(challenges[2].type).toBe('chain');      // word_chain -> chain
      expect(challenges[3].type).toBe('spotOn');     // definition_match -> spotOn
      expect(challenges[4].type).toBe('trio');       // trending_trio -> trio
      expect(challenges[5].type).toBe('scrambled');  // riddle -> scrambled
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
