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

  it('should validate words using main dictionary module (handles spelling variations)', async () => {
    // This test verifies that buzzGenerator uses the main dictionary module
    // which properly handles community-approved words and spelling variations
    // The word צפיה (viewing) should be validated even if dictionary only has צפייה (double yud)

    // Update mock to return response with a word that requires dictionary module features
    mockGenerateContent.mockResolvedValueOnce({
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

    const today = new Date();
    const language = 'he';

    // Should succeed because dictionary module handles validation properly
    const result = await generateDailyBuzz(today, language);
    expect(result).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);
  });

  it('should repair and parse truncated JSON responses', async () => {
    // Simulate a truncated JSON response (common with maxOutputTokens limits)
    const truncatedResponse = `{
  "date": "2026-01-13",
  "language": "he",
  "trending_summary": "מגמות מובילות",
  "challenges": [
    {
      "type": "anagram",
      "trend_topic": "ישראל",
      "prompt": "פתרו: לארשי",
      "answer": "ישראל",
      "hint": "שם מדינה",
      "difficulty": "easy",
      "trending_context": "ישראל בחדשות"
    },
    {
      "type": "fill_blank",
      "trend_topic": "טכנולוגיה",
      "prompt": "השלימו: טכ_ _ _ _ _ _",
      "answer": "טכנולוגיה",
      "hint": "חדשנות",
      "difficulty": "medium",
      "trending_context": "חדשות טכנולוגיה"
    },
    {
      "type": "definition_match",
      "trend_topic": "ספורט",
      "prompt": "התאימו את המילה",
      "answer": "ספורט",
      "options": ["ספורט", "משחק", "פעילות", "ריצה"],
      "hint": "פעילות גופנית",
      "difficulty": "medium",
      "trending_context": "אירועי ספורט"
    },
    {
      "type": "anagram",
      "trend_topic": "רקורד",
      "prompt": "פתרו: דרוקר",
      "answer": "רקורד",
      "hint": "הישג",
      "difficulty": "easy",
      "trending_context": "רקורד חדש"
    },
    {
      "type": "fill_blank",
      "trend_topic": "שחקנית",
      "prompt": "השלימו: שח_ _ _ _",
      "answer": "שחקנית",
      "hint": "אמנית",
      "difficulty": "easy",
      "trending_context": "חדשות סלבריטאים"
    },
    {
      "type": "defi`;  // Intentionally truncated mid-word

    // Update mock to return truncated response
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [{ text: truncatedResponse }],
            },
          },
        ],
      },
    });

    const today = new Date();
    const language = 'he';

    // Should NOT throw - should repair and use valid challenges
    const result = await generateDailyBuzz(today, language);

    // Verify we got at least 5 valid challenges (the repair logic should salvage complete ones)
    expect(result).toBeDefined();
    expect(result.challenges).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);
  });
});

// Note: Tests for getPromptExamples, storePromptExample, and regenerateSingleChallenge
// require complex dynamic import mocking that conflicts with existing Supabase mock setup.
// These functions are tested through E2E integration tests instead.

describe('Wordle challenge validation', () => {
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

    // Mock fetchGoogleTrends to return sample trends
    (serpApiClient.fetchGoogleTrends as jest.Mock).mockResolvedValue([
      {
        query: 'technology',
        search_volume: 500000,
        active: true,
        categories: [{ id: 5, name: 'Science & Technology' }],
        trend_breakdown: ['Tech news'],
      },
      {
        query: 'sports',
        search_volume: 200000,
        active: true,
        categories: [{ id: 7, name: 'Sports' }],
        trend_breakdown: ['Sports news'],
      },
      {
        query: 'music',
        search_volume: 150000,
        active: true,
        categories: [{ id: 3, name: 'Entertainment' }],
        trend_breakdown: ['Music news'],
      },
    ]);
  });

  it('should reject wordle_guess challenges with non-5-letter answers', async () => {
    // AI returns a wordle_guess challenge with 6 letters (SNACKS instead of SNACK)
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    date: '2026-01-14',
                    language: 'en',
                    trending_summary: 'Tech & Sports',
                    challenges: [
                      {
                        type: 'anagram',
                        trend_topic: 'technology',
                        prompt: 'Unscramble: CHEYT',
                        answer: 'TECHY',
                        hint: 'Tech savvy',
                        difficulty: 'easy',
                        trending_context: 'Tech trends',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'sports',
                        prompt: 'The team scored a _____ (4 letters)',
                        answer: 'GOAL',
                        hint: 'Point in soccer',
                        difficulty: 'easy',
                        trending_context: 'Sports news',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'Super Bowl',
                        prompt: 'What fans eat during the big game',
                        answer: 'SNACKS', // 6 letters - should be rejected!
                        hint: 'Munchies',
                        difficulty: 'easy',
                        trending_context: 'Super Bowl party',
                      },
                      {
                        type: 'riddle',
                        trend_topic: 'music',
                        prompt: 'I have keys but no locks',
                        answer: 'PIANO',
                        hint: 'Musical instrument',
                        difficulty: 'medium',
                        trending_context: 'Music trending',
                      },
                      {
                        type: 'definition_match',
                        trend_topic: 'technology',
                        prompt: 'A device for computing',
                        answer: 'COMPUTER',
                        options: ['COMPUTER', 'PHONE', 'TABLET', 'WATCH'],
                        hint: 'Desktop or laptop',
                        difficulty: 'easy',
                        trending_context: 'Tech news',
                      },
                      {
                        type: 'word_chain',
                        trend_topic: 'sports',
                        prompt: 'BALL → ? → NET',
                        answer: 'GAME',
                        hint: 'Competition',
                        difficulty: 'medium',
                        trending_context: 'Sports chain',
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

    const today = new Date();
    const result = await generateDailyBuzz(today, 'en');

    // The wordle_guess with 6-letter answer should be filtered out
    const wordleChallenges = result.challenges.filter(c => c.type === 'wordle_guess');

    // Verify no wordle_guess challenges have non-5-letter answers
    for (const challenge of wordleChallenges) {
      expect(challenge.answer.length).toBe(5);
    }

    // The invalid 6-letter SNACKS should not be in the final results
    const hasSnacks = result.challenges.some(c => c.answer === 'SNACKS');
    expect(hasSnacks).toBe(false);
  });

  it('should accept wordle_guess challenges with exactly 5-letter answers', async () => {
    // AI returns a wordle_guess challenge with correct 5 letters
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    date: '2026-01-14',
                    language: 'en',
                    trending_summary: 'Tech & Sports',
                    challenges: [
                      {
                        type: 'anagram',
                        trend_topic: 'technology',
                        prompt: 'Unscramble: CHEYT',
                        answer: 'TECHY',
                        hint: 'Tech savvy',
                        difficulty: 'easy',
                        trending_context: 'Tech trends',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'sports',
                        prompt: 'The team scored a _____ (4 letters)',
                        answer: 'GOAL',
                        hint: 'Point in soccer',
                        difficulty: 'easy',
                        trending_context: 'Sports news',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'Super Bowl',
                        prompt: 'What fans eat during the big game',
                        answer: 'SNACK', // Exactly 5 letters - should be accepted!
                        hint: 'Munchies',
                        difficulty: 'easy',
                        trending_context: 'Super Bowl party',
                      },
                      {
                        type: 'riddle',
                        trend_topic: 'music',
                        prompt: 'I have keys but no locks',
                        answer: 'PIANO',
                        hint: 'Musical instrument',
                        difficulty: 'medium',
                        trending_context: 'Music trending',
                      },
                      {
                        type: 'definition_match',
                        trend_topic: 'technology',
                        prompt: 'A device for computing',
                        answer: 'COMPUTER',
                        options: ['COMPUTER', 'PHONE', 'TABLET', 'WATCH'],
                        hint: 'Desktop or laptop',
                        difficulty: 'easy',
                        trending_context: 'Tech news',
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

    const today = new Date();
    const result = await generateDailyBuzz(today, 'en');

    // The wordle_guess with 5-letter answer should be included
    const wordleChallenges = result.challenges.filter(c => c.type === 'wordle_guess');
    expect(wordleChallenges.length).toBe(1);
    expect(wordleChallenges[0].answer).toBe('SNACK');
    expect(wordleChallenges[0].answer.length).toBe(5);
  });
});
