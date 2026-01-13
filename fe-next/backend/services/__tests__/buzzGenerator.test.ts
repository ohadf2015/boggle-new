/**
 * Tests for Daily Buzz Generator
 * Specifically testing Hebrew generation with no cached trends
 */

import { generateDailyBuzz } from '../buzzGenerator';
import * as serpApiClient from '../serpApiClient';

// Mock dependencies
jest.mock('../serpApiClient');
jest.mock('../imagenClient');
jest.mock('@google-cloud/vertexai');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'daily_buzz_challenges') {
        return {
          upsert: jest.fn(() => ({ error: null })),
        };
      }
      if (table === 'feature_flags') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn(() => ({ data: { enabled: false }, error: null })),
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(() => ({ data: null, error: null })),
          })),
        })),
        upsert: jest.fn(() => ({ error: null })),
        insert: jest.fn(() => ({ error: null })),
      };
    }),
  })),
}));

// Mock dynamic imports
jest.mock('an-array-of-english-words', () => ({
  default: ['ISRAEL', 'TECHNOLOGY', 'SPORT', 'ACTRESS', 'RECORD', 'VORTEX', 'BREEZE', 'WARM', 'CALM'],
}));
jest.mock('an-array-of-spanish-words', () => ({
  default: ['ISRAEL', 'TECNOLOGÍA', 'DEPORTE'],
}));
jest.mock('@arvidbt/swedish-words', () => ({
  words: ['ISRAEL', 'TEKNOLOGI', 'SPORT'],
}));

// Mock fs/promises for Hebrew dictionary
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('ישראל\nטכנולוגיה\nספורט\nאומנות\nשחקנית\nרקורד\nמשחק\nפעילות\nריצה'),
}));

// Mock path
jest.mock('path', () => ({
  join: jest.fn((...args: string[]) => args.join('/')),
}));

// Mock VertexAI
const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                date: '2026-01-13',
                language: 'he',
                trending_summary: 'מגמות מובילות: ישראל, טכנולוגיה, ספורט',
                challenges: [
                  {
                    type: 'anagram',
                    trend_topic: 'ישראל',
                    prompt: 'פתרו: לארשי',
                    answer: 'ישראל',
                    hint: 'שם מדינה',
                    difficulty: 'easy',
                    trending_context: 'ישראל בחדשות',
                  },
                  {
                    type: 'fill_blank',
                    trend_topic: 'טכנולוגיה',
                    prompt: 'השלימו: טכ_ _ _ _ _ _',
                    answer: 'טכנולוגיה',
                    hint: 'חדשנות',
                    difficulty: 'medium',
                    trending_context: 'חדשות טכנולוגיה',
                  },
                  {
                    type: 'definition_match',
                    trend_topic: 'ספורט',
                    prompt: 'התאימו את המילה',
                    answer: 'ספורט',
                    options: ['ספורט', 'משחק', 'פעילות', 'ריצה'],
                    hint: 'פעילות גופנית',
                    difficulty: 'medium',
                    trending_context: 'אירועי ספורט',
                  },
                  {
                    type: 'anagram',
                    trend_topic: 'רקורד',
                    prompt: 'פתרו: דרוקר',
                    answer: 'רקורד',
                    hint: 'הישג',
                    difficulty: 'easy',
                    trending_context: 'רקורד חדש',
                  },
                  {
                    type: 'fill_blank',
                    trend_topic: 'שחקנית',
                    prompt: 'השלימו: שח_ _ _ _',
                    answer: 'שחקנית',
                    hint: 'אמנית',
                    difficulty: 'easy',
                    trending_context: 'חדשות סלבריטאים',
                  },
                ],
              }),
            },
          ],
        },
      },
    ],
  },
});

jest.mock('@google-cloud/vertexai', () => ({
  VertexAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}));

describe('Daily Buzz Generator - Hebrew without cached trends', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock environment variables
    process.env.GOOGLE_CREDENTIALS_JSON = JSON.stringify({
      project_id: 'test-project',
      private_key: 'test-key',
      client_email: 'test@test.com',
    });
    process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    // Mock getTrendsFromDbCache to return null (no cached trends)
    (serpApiClient.getTrendsFromDbCache as jest.Mock).mockResolvedValue(null);

    // Mock fetchGoogleTrends to return sample trends matching SERP API structure
    (serpApiClient.fetchGoogleTrends as jest.Mock).mockResolvedValue([
      {
        query: 'ישראל',
        search_volume: 500000,
        active: true,
        categories: [{ id: 1, name: 'News' }],
        trend_breakdown: ['Breaking News', 'Important news about Israel'],
      },
      {
        query: 'טכנולוגיה',
        search_volume: 200000,
        active: true,
        categories: [{ id: 5, name: 'Science & Technology' }],
        trend_breakdown: ['Tech Update', 'New technology trends'],
      },
      {
        query: 'ספורט',
        search_volume: 150000,
        active: true,
        categories: [{ id: 7, name: 'Sports' }],
        trend_breakdown: ['Sports News', 'Latest sports updates'],
      },
    ]);
  });

  it('should fetch trends from SERP API when database cache is empty for Hebrew', async () => {
    const today = new Date();
    const language = 'he';

    // This should NOT throw an error - it should fetch from SERP API
    await expect(generateDailyBuzz(today, language)).resolves.toBeDefined();

    // Verify fetchGoogleTrends was called with correct region
    expect(serpApiClient.fetchGoogleTrends).toHaveBeenCalledWith('IL', expect.anything());
  });

  it('should use fallback topics when SERP API returns no trends', async () => {
    // Mock both cache and SERP API to return empty
    (serpApiClient.getTrendsFromDbCache as jest.Mock).mockResolvedValue(null);
    (serpApiClient.fetchGoogleTrends as jest.Mock).mockResolvedValue([]);

    const today = new Date();
    const language = 'he';

    // Should NOT throw - should use fallback topics instead
    const result = await generateDailyBuzz(today, language);

    // Verify result is valid
    expect(result).toBeDefined();
    expect(result.challenges).toBeDefined();
    expect(result.challenges.length).toBeGreaterThan(0);
    expect(result.trending_topics).toBeDefined();
    expect(result.trending_topics.length).toBeGreaterThan(0);

    // Verify fallback topics were used (check for generic topics)
    const topicQueries = result.trending_topics.map(t => t.query.toLowerCase());
    const hasGenericTopics = topicQueries.some(q =>
      ['technology', 'nature', 'music', 'science', 'travel'].includes(q)
    );
    expect(hasGenericTopics).toBe(true);
  });
});
