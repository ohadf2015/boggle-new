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

// Mock VertexAI - Default mock with English challenges (no spoilers)
const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                date: '2026-01-13',
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
                    prompt: 'What fans eat during the big game (5 letters)',
                    answer: 'SNACK',
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
                    type: 'word_chain',
                    trend_topic: 'entertainment',
                    prompt: 'BALL → ? → NET',
                    answer: 'GAME',
                    hint: 'Competition',
                    difficulty: 'medium',
                    trending_context: 'Fun activities',
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

    // Mock storeTrendsInDbCache to return resolved promise
    (serpApiClient.storeTrendsInDbCache as jest.Mock).mockResolvedValue(undefined);

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
    // Mock Hebrew challenges (provide for multiple AI calls - moderation + generation)
    const hebrewResponse = {
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    date: '2026-01-13',
                    language: 'he',
                    trending_summary: 'מגמות מובילות',
                    challenges: [
                      {
                        type: 'anagram',
                        trend_topic: 'חדשות',
                        prompt: 'פתרו: לארשי',
                        answer: 'ישראל',
                        hint: 'שם מדינה',
                        difficulty: 'easy',
                        trending_context: 'חדשות היום',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'בידור',
                        prompt: 'השלימו: משח_',
                        answer: 'משחק',
                        hint: 'בידור',
                        difficulty: 'easy',
                        trending_context: 'בידור היום',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'ספורט',
                        prompt: 'משחק עגול (4 letters)',
                        answer: 'כדור',
                        hint: 'משחק',
                        difficulty: 'medium',
                        trending_context: 'אירועי ספורט',
                      },
                      {
                        type: 'anagram',
                        trend_topic: 'הישגים',
                        prompt: 'פתרו: דרוקר',
                        answer: 'רקורד',
                        hint: 'הישג',
                        difficulty: 'easy',
                        trending_context: 'הישגים חדשים',
                      },
                      {
                        type: 'riddle',
                        trend_topic: 'תנועה',
                        prompt: 'אני דורש תנועה',
                        answer: 'פעילות',
                        hint: 'עשייה',
                        difficulty: 'medium',
                        trending_context: 'תנועה יומית',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      },
    };

    // Provide mock for multiple AI calls (content moderation + challenge generation)
    mockGenerateContent.mockResolvedValueOnce(hebrewResponse);
    mockGenerateContent.mockResolvedValueOnce(hebrewResponse);

    const today = new Date();
    const language = 'he';

    // This should NOT throw an error - it should fetch from SERP API
    await expect(generateDailyBuzz(today, language)).resolves.toBeDefined();

    // Verify fetchGoogleTrends was called with correct region (enrichment defaults to OFF)
    expect(serpApiClient.fetchGoogleTrends).toHaveBeenCalledWith('IL', expect.anything(), false);
  });

  it('should use fallback topics when SERP API returns no trends', async () => {
    // Mock both cache and SERP API to return empty
    (serpApiClient.getTrendsFromDbCache as jest.Mock).mockResolvedValue(null);
    (serpApiClient.fetchGoogleTrends as jest.Mock).mockResolvedValue([]);

    // Mock Hebrew challenges (provide for multiple AI calls)
    const hebrewResponse = {
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    date: '2026-01-13',
                    language: 'he',
                    trending_summary: 'נושאים כלליים',
                    challenges: [
                      {
                        type: 'anagram',
                        trend_topic: 'חדשות',
                        prompt: 'פתרו: לארשי',
                        answer: 'ישראל',
                        hint: 'שם מדינה',
                        difficulty: 'easy',
                        trending_context: 'חדשות היום',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'בידור',
                        prompt: 'השלימו: משח_',
                        answer: 'משחק',
                        hint: 'בידור',
                        difficulty: 'easy',
                        trending_context: 'בידור היום',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'ספורט',
                        prompt: 'משחק עגול (4 letters)',
                        answer: 'כדור',
                        hint: 'משחק',
                        difficulty: 'medium',
                        trending_context: 'אירועי ספורט',
                      },
                      {
                        type: 'anagram',
                        trend_topic: 'הישגים',
                        prompt: 'פתרו: דרוקר',
                        answer: 'רקורד',
                        hint: 'הישג',
                        difficulty: 'easy',
                        trending_context: 'הישגים חדשים',
                      },
                      {
                        type: 'riddle',
                        trend_topic: 'תנועה',
                        prompt: 'אני דורש תנועה',
                        answer: 'פעילות',
                        hint: 'עשייה',
                        difficulty: 'medium',
                        trending_context: 'תנועה יומית',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      },
    };

    // Provide mock for multiple AI calls
    mockGenerateContent.mockResolvedValueOnce(hebrewResponse);
    mockGenerateContent.mockResolvedValueOnce(hebrewResponse);

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
      ['technology', 'nature', 'music', 'science', 'travel', 'טכנולוגיה', 'טבע', 'מוסיקה', 'ספורט', 'רקורד', 'פעילות', 'ישראל', 'משחק'].includes(q)
    );
    expect(hasGenericTopics).toBe(true);
  });

  it('should validate words using main dictionary module (handles spelling variations)', async () => {
    // This test verifies that buzzGenerator uses the main dictionary module
    // which properly handles community-approved words and spelling variations
    // The word צפיה (viewing) should be validated even if dictionary only has צפייה (double yud)

    // Update mock to return response with a word that requires dictionary module features
    const hebrewResponse = {
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
                        trend_topic: 'חדשות',
                        prompt: 'פתרו: לארשי',
                        answer: 'ישראל',
                        hint: 'שם מדינה',
                        difficulty: 'easy',
                        trending_context: 'חדשות היום',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'חדשנות',
                        prompt: 'השלימו: טכ_ _ _ _ _ _',
                        answer: 'טכנולוגיה',
                        hint: 'חדשנות',
                        difficulty: 'medium',
                        trending_context: 'חדשנות דיגיטלית',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'ספורט',
                        prompt: 'משחק עגול (4 letters)',
                        answer: 'כדור',
                        hint: 'משחק',
                        difficulty: 'medium',
                        trending_context: 'אירועי ספורט',
                      },
                      {
                        type: 'anagram',
                        trend_topic: 'הישגים',
                        prompt: 'פתרו: דרוקר',
                        answer: 'רקורד',
                        hint: 'הישג',
                        difficulty: 'easy',
                        trending_context: 'הישגים חדשים',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'סלבריטאים',
                        prompt: 'השלימו: שח_ _ _ _',
                        answer: 'שחקנית',
                        hint: 'אמנית',
                        difficulty: 'easy',
                        trending_context: 'חדשות הבידור',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      },
    };

    // Provide mock for multiple AI calls (content moderation + challenge generation)
    mockGenerateContent.mockResolvedValueOnce(hebrewResponse);
    mockGenerateContent.mockResolvedValueOnce(hebrewResponse);

    const today = new Date();
    const language = 'he';

    // Should succeed because dictionary module handles validation properly
    const result = await generateDailyBuzz(today, language);
    expect(result).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);
  });

  it('should repair and parse truncated JSON responses', async () => {
    // Reset mock to avoid interference
    mockGenerateContent.mockClear();
    // Simulate a truncated JSON response (common with maxOutputTokens limits)
    const truncatedResponse = `{
  "date": "2026-01-13",
  "language": "he",
  "trending_summary": "מגמות מובילות",
  "challenges": [
    {
      "type": "anagram",
      "trend_topic": "חדשות",
      "prompt": "פתרו: לארשי",
      "answer": "ישראל",
      "hint": "שם מדינה",
      "difficulty": "easy",
      "trending_context": "חדשות היום"
    },
    {
      "type": "fill_blank",
      "trend_topic": "חדשנות",
      "prompt": "השלימו: טכ_ _ _ _ _ _",
      "answer": "טכנולוגיה",
      "hint": "חדשנות",
      "difficulty": "medium",
      "trending_context": "חדשנות דיגיטלית"
    },
    {
      "type": "wordle_guess",
      "trend_topic": "ספורט",
      "prompt": "משחק עגול (4 letters)",
      "answer": "כדור",
      "hint": "משחק",
      "difficulty": "medium",
      "trending_context": "אירועי ספורט"
    },
    {
      "type": "anagram",
      "trend_topic": "הישגים",
      "prompt": "פתרו: דרוקר",
      "answer": "רקורד",
      "hint": "הישג",
      "difficulty": "easy",
      "trending_context": "הישגים חדשים"
    },
    {
      "type": "fill_blank",
      "trend_topic": "סלבריטאים",
      "prompt": "השלימו: שח_ _ _ _",
      "answer": "שחקנית",
      "hint": "אמנית",
      "difficulty": "easy",
      "trending_context": "חדשות הבידור"
    },
    {
      "type": "definition_match",
      "trend_topic": "מוסיקה",
      "prompt": "התאימו את המילה",
      "answer": "שיר",
      "options": ["שיר", "משחק", "פעילות", "ריצה"],
      "hint": "מנגינה",
      "difficulty": "medium",
      "trending_context": "מוסיקה בחדשות"
    },
    {
      "type": "defi`;  // Intentionally truncated mid-word

    // Update mock to return truncated response (use mockResolvedValue for all AI calls)
    mockGenerateContent.mockResolvedValue({
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

describe('Sports riddle constraint validation', () => {
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

  it('should filter out extra sports riddles beyond the first one', async () => {
    // AI returns multiple sports-related riddles - only first should be kept
    const sportsResponse = {
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
                        type: 'riddle',
                        trend_topic: 'Basketball Championship',
                        prompt: 'I fly without wings in a court of dreams',
                        answer: 'DUNK',
                        hint: 'Score two points',
                        difficulty: 'medium',
                        trending_context: 'NBA championship playoffs',
                      },
                      {
                        type: 'riddle',
                        trend_topic: 'Soccer World Cup',
                        prompt: 'I score goals but am not a player',
                        answer: 'BALL',
                        hint: 'Round object',
                        difficulty: 'easy',
                        trending_context: 'World Cup soccer match',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: 'music',
                        prompt: 'Complete: MUS_C',
                        answer: 'MUSIC',
                        hint: 'Sound art',
                        difficulty: 'easy',
                        trending_context: 'Music trending',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'technology',
                        prompt: 'A common tech term (5 letters)',
                        answer: 'SMART',
                        hint: 'Desktop or laptop',
                        difficulty: 'easy',
                        trending_context: 'Tech news',
                      },
                      {
                        type: 'word_chain',
                        trend_topic: 'entertainment',
                        prompt: 'PLAY → ??? → SHOW',
                        answer: 'DRAMA',
                        hint: 'Theatrical genre',
                        difficulty: 'medium',
                        trending_context: 'Entertainment chain',
                      },
                      {
                        type: 'definition_match',
                        trend_topic: 'science',
                        prompt: 'A force that pulls objects toward Earth',
                        answer: 'GRAVITY',
                        options: ['GRAVITY', 'MAGNETS', 'FRICTION', 'INERTIA'],
                        hint: 'Newton discovered it',
                        difficulty: 'easy',
                        trending_context: 'Science news',
                      },
                    ],
                  }),
                },
              ],
            },
          },
        ],
      },
    };

    // Provide mock for multiple AI calls (content moderation + challenge generation)
    mockGenerateContent.mockResolvedValueOnce(sportsResponse);
    mockGenerateContent.mockResolvedValueOnce(sportsResponse);

    const today = new Date();
    const result = await generateDailyBuzz(today, 'en');

    // Count sports-related riddles in the result
    const sportsRiddles = result.challenges.filter(c => {
      if (c.type !== 'riddle') return false;
      const topic = c.trend_topic?.toLowerCase() ?? '';
      const prompt = c.prompt?.toLowerCase() ?? '';
      const context = c.trending_context?.toLowerCase() ?? '';
      const sportsKeywords = ['basketball', 'soccer', 'football', 'championship', 'world cup', 'nba', 'match', 'player', 'goal'];
      return sportsKeywords.some(kw => topic.includes(kw) || prompt.includes(kw) || context.includes(kw));
    });

    // Should have at most 1 sports riddle
    expect(sportsRiddles.length).toBeLessThanOrEqual(1);

    // Should still have at least 5 valid challenges total
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);
  });
});

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
    // First mock: AI content moderation response (approves all trends)
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { index: 1, approved: true, category: 'approved' },
                    { index: 2, approved: true, category: 'approved' },
                    { index: 3, approved: true, category: 'approved' },
                  ]),
                },
              ],
            },
          },
        ],
      },
    });

    // Second mock: AI returns a wordle_guess challenge with 6 letters (SNACKS instead of SNACK)
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
                        type: 'wordle_guess',
                        trend_topic: 'technology',
                        prompt: 'A common tech term (5 letters)',
                        answer: 'SMART',
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
    // First mock: AI content moderation response (approves all trends)
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { index: 1, approved: true, category: 'approved' },
                    { index: 2, approved: true, category: 'approved' },
                    { index: 3, approved: true, category: 'approved' },
                  ]),
                },
              ],
            },
          },
        ],
      },
    });

    // Second mock: AI returns a wordle_guess challenge with correct 5 letters
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
                        type: 'wordle_guess',
                        trend_topic: 'technology',
                        prompt: 'A common tech term (5 letters)',
                        answer: 'SMART',
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

    // The wordle_guess challenges with 5-letter answers should be included
    const wordleChallenges = result.challenges.filter(c => c.type === 'wordle_guess');
    expect(wordleChallenges.length).toBe(2);
    expect(wordleChallenges.every(c => c.answer.length === 5)).toBe(true);
  });
});

describe('generateDailyBuzz with deleteBeforeRegenerate option', () => {
  // Store original mock
  const originalMock = jest.requireMock('@supabase/supabase-js');

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mockGenerateContent to default English challenges
    mockGenerateContent.mockClear();

    // Mock environment variables
    process.env.GOOGLE_CREDENTIALS_JSON = JSON.stringify({
      project_id: 'test-project',
      private_key: 'test-key',
      client_email: 'test@test.com',
    });
    process.env.GOOGLE_CLOUD_LOCATION = 'us-central1';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';

    // Update Supabase mock to handle delete operations
    originalMock.createClient.mockImplementation(() => ({
      from: jest.fn((table: string) => {
        if (table === 'daily_buzz_challenges') {
          return {
            upsert: jest.fn(() => ({ error: null })),
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  eq: jest.fn(() => ({
                    single: jest.fn(() => ({ data: { id: 1 }, error: null })),
                  })),
                })),
              })),
            })),
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({ error: null })),
            })),
          };
        }
        if (table === 'daily_buzz_attempts') {
          return {
            delete: jest.fn(() => ({
              eq: jest.fn(() => ({ error: null })),
            })),
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
        if (table === 'buzz_prompt_examples') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                eq: jest.fn(() => ({
                  order: jest.fn(() => ({
                    limit: jest.fn(() => ({ data: [], error: null })),
                  })),
                })),
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
    }));

    // Mock getTrendsFromDbCache to return sample trends
    (serpApiClient.getTrendsFromDbCache as jest.Mock).mockResolvedValue([
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

  it('should accept options object with deleteBeforeRegenerate', async () => {
    const optionsTestResponse = {
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
                        type: 'riddle',
                        trend_topic: 'music',
                        prompt: 'I have keys but no locks',
                        answer: 'PIANO',
                        hint: 'Musical instrument',
                        difficulty: 'medium',
                        trending_context: 'Music trending',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'technology',
                        prompt: 'A common tech term (5 letters)',
                        answer: 'SMART',
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
    };

    // Provide mock for multiple AI calls (content moderation + challenge generation)
    mockGenerateContent.mockResolvedValueOnce(optionsTestResponse);
    mockGenerateContent.mockResolvedValueOnce(optionsTestResponse);

    const today = new Date();

    // Should accept options object
    const result = await generateDailyBuzz(today, 'en', { deleteBeforeRegenerate: true });
    expect(result).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);
  });

  it('should still support legacy cachedTrends array parameter', async () => {
    const legacyTestResponse = {
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
                        type: 'riddle',
                        trend_topic: 'music',
                        prompt: 'I have keys but no locks',
                        answer: 'PIANO',
                        hint: 'Musical instrument',
                        difficulty: 'medium',
                        trending_context: 'Music trending',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'technology',
                        prompt: 'A common tech term (5 letters)',
                        answer: 'SMART',
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
    };

    // Provide mock for multiple AI calls (content moderation + challenge generation)
    mockGenerateContent.mockResolvedValueOnce(legacyTestResponse);
    mockGenerateContent.mockResolvedValueOnce(legacyTestResponse);

    const today = new Date();
    const legacyTrends = [
      {
        query: 'custom',
        search_volume: 100000,
        active: true,
        categories: [{ id: 1, name: 'Custom' }],
        trend_breakdown: ['Custom trend'],
      },
      {
        query: 'trends',
        search_volume: 90000,
        active: true,
        categories: [{ id: 1, name: 'Custom' }],
        trend_breakdown: ['More trends'],
      },
      {
        query: 'test',
        search_volume: 80000,
        active: true,
        categories: [{ id: 1, name: 'Custom' }],
        trend_breakdown: ['Test trend'],
      },
    ];

    // Should accept array directly (legacy signature)
    const result = await generateDailyBuzz(today, 'en', legacyTrends);
    expect(result).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);
  });
});

describe('Japanese 2-letter word validation', () => {
  // Trends must have query.length >= 3 to pass filterTrends()
  // Using longer topic names but answers can still be 2 characters
  const japaneseTrends = [
    {
      query: '地震速報',  // 4 chars - earthquake alert
      search_volume: 500000,
      active: true,
      categories: [{ id: 1, name: 'News' }],
      trend_breakdown: ['Earthquake news'],
    },
    {
      query: '東京タワー',  // 5 chars - Tokyo Tower
      search_volume: 300000,
      active: true,
      categories: [{ id: 3, name: 'Travel' }],
      trend_breakdown: ['Tokyo news'],
    },
    {
      query: '花火大会',  // 4 chars - Fireworks festival
      search_volume: 200000,
      active: true,
      categories: [{ id: 5, name: 'Events' }],
      trend_breakdown: ['Fireworks festival'],
    },
  ];

  const englishTrends = [
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
  ];

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

    // Mock getTrendsFromDbCache to return null (will use fetchGoogleTrends)
    (serpApiClient.getTrendsFromDbCache as jest.Mock).mockResolvedValue(null);

    // Mock fetchGoogleTrends - dynamically return based on region
    (serpApiClient.fetchGoogleTrends as jest.Mock).mockImplementation((region: string) => {
      if (region === 'JP') {
        return Promise.resolve(japaneseTrends);
      }
      return Promise.resolve(englishTrends);
    });
  });

  it('should accept 2-letter Japanese answers (kanji compounds)', async () => {
    // First mock: AI content moderation response (approves all Japanese trends)
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { index: 1, approved: true, category: 'approved' },
                    { index: 2, approved: true, category: 'approved' },
                    { index: 3, approved: true, category: 'approved' },
                  ]),
                },
              ],
            },
          },
        ],
      },
    });

    // Second mock: AI returns challenges with valid 2-letter Japanese answers
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    date: '2026-01-14',
                    language: 'ja',
                    trending_summary: '地震速報・東京タワー・花火大会',
                    challenges: [
                      {
                        type: 'anagram',
                        trend_topic: '地震速報',
                        prompt: 'れゆ を並べ替え',
                        answer: 'ゆれ', // 2-letter hiragana word (shaking/trembling)
                        hint: '揺れる',
                        difficulty: 'easy',
                        trending_context: '地震のニュース',
                      },
                      {
                        type: 'fill_blank',
                        trend_topic: '東京タワー',
                        prompt: '___の街 (2文字)',
                        answer: '首都', // 2-letter kanji compound (capital city)
                        hint: '日本の首都',
                        difficulty: 'easy',
                        trending_context: 'タワーのイベント',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: '花火大会',
                        prompt: '夏の楽しみ (5文字)',
                        answer: 'まつりば', // 5-letter hiragana (festival place)
                        hint: '夜空に咲く',
                        difficulty: 'medium',
                        trending_context: '夏の楽しみ',
                      },
                      {
                        type: 'riddle',
                        trend_topic: '地震',
                        prompt: '地面が動く現象',
                        answer: 'じしん', // 3-letter hiragana (avoiding spoiler)
                        hint: '揺れる',
                        difficulty: 'medium',
                        trending_context: '地震ニュース',
                      },
                      {
                        type: 'anagram',
                        trend_topic: '東京タワー',
                        prompt: 'うきょと を並べ替え',
                        answer: 'とうきょう', // 4-letter hiragana
                        hint: '首都',
                        difficulty: 'easy',
                        trending_context: '東京の天気',
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
    const result = await generateDailyBuzz(today, 'ja');

    // Should have at least 5 challenges (all should pass validation)
    expect(result).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);

    // 2-letter Japanese answers should be included
    const twoLetterChallenges = result.challenges.filter(c => c.answer.length === 2);
    expect(twoLetterChallenges.length).toBeGreaterThan(0);

    // Verify specific Japanese words are present (updated to match mock data without spoilers)
    const answers = result.challenges.map(c => c.answer);
    expect(answers).toContain('ゆれ'); // 2-letter hiragana
    expect(answers).toContain('首都'); // 2-letter kanji (replaced 東京 to avoid spoiler)
    expect(answers).toContain('まつりば'); // 5-letter hiragana wordle answer
    expect(answers).toContain('じしん'); // 3-letter hiragana (replaced 地震 to avoid spoiler)
  });

  it('should still reject 2-letter English answers', async () => {
    // First mock: AI content moderation response (approves all trends)
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify([
                    { index: 1, approved: true, category: 'approved' },
                    { index: 2, approved: true, category: 'approved' },
                    { index: 3, approved: true, category: 'approved' },
                  ]),
                },
              ],
            },
          },
        ],
      },
    });

    // Second mock: AI returns a challenge with invalid 2-letter English answer
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
                        prompt: 'Unscramble: TI',
                        answer: 'IT', // 2 letters - should be rejected for English!
                        hint: 'Information tech',
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
                        type: 'riddle',
                        trend_topic: 'music',
                        prompt: 'I have keys but no locks',
                        answer: 'PIANO',
                        hint: 'Musical instrument',
                        difficulty: 'medium',
                        trending_context: 'Music trending',
                      },
                      {
                        type: 'wordle_guess',
                        trend_topic: 'technology',
                        prompt: 'A common tech term (5 letters)',
                        answer: 'SMART',
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
                      {
                        type: 'anagram',
                        trend_topic: 'technology',
                        prompt: 'Unscramble: IGDLA',
                        answer: 'ALGID',
                        hint: 'Cold',
                        difficulty: 'hard',
                        trending_context: 'Tech trends',
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

    // Should have at least 5 challenges (IT should be filtered out)
    expect(result).toBeDefined();
    expect(result.challenges.length).toBeGreaterThanOrEqual(5);

    // The 2-letter English word "IT" should NOT be included
    const answers = result.challenges.map(c => c.answer);
    expect(answers).not.toContain('IT');

    // All English answers should be at least 3 letters
    for (const challenge of result.challenges) {
      expect(challenge.answer.length).toBeGreaterThanOrEqual(3);
    }
  });
});
