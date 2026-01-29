/**
 * Tests for Daily Buzz Context Service
 * Vocabulary enrichment with trending context examples
 */

import { getDailyBuzz } from '../../../backend/services/buzz/databaseService';
import {
  normalizeWord,
  findContextualExamples,
  enrichVocabularyWithContext,
} from '../dailyBuzzContextService';

// Mock the database service
jest.mock('../../../backend/services/buzz/databaseService');

const mockGetDailyBuzz = getDailyBuzz as jest.MockedFunction<typeof getDailyBuzz>;

describe('normalizeWord', () => {
  it('should convert word to lowercase', () => {
    expect(normalizeWord('WORD')).toBe('word');
    expect(normalizeWord('Word')).toBe('word');
  });

  it('should trim whitespace', () => {
    expect(normalizeWord('  word  ')).toBe('word');
  });

  it('should remove common suffixes for stem matching', () => {
    expect(normalizeWord('running')).toBe('run');
    expect(normalizeWord('walked')).toBe('walk');
    expect(normalizeWord('cars')).toBe('car');
    expect(normalizeWord('stories')).toBe('stori'); // -ies → -i
  });

  it('should handle words without suffixes', () => {
    expect(normalizeWord('run')).toBe('run');
    expect(normalizeWord('cat')).toBe('cat');
  });

  it('should handle short words correctly', () => {
    expect(normalizeWord('is')).toBe('is');
    expect(normalizeWord('at')).toBe('at');
  });
});

describe('findContextualExamples', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty array when no buzz data available', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce(null);

    const result = await findContextualExamples('technology', 'en');

    expect(result).toEqual([]);
  });

  it('should find exact word match in trending_context', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'Tech news',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'AI',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'Artificial intelligence technology is revolutionizing healthcare. AI systems can now diagnose diseases with high accuracy.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const result = await findContextualExamples('technology', 'en');

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Artificial intelligence technology is revolutionizing healthcare.');
  });

  it('should handle word variations with fuzzy matching', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Test',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'Companies are developing new technologies every day. Technological advances continue.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const result = await findContextualExamples('technology', 'en');

    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toContain('technolog');
  });

  it('should extract sentences containing the word', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Test',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'First sentence here. Climate change is affecting global weather patterns. Another sentence.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const result = await findContextualExamples('climate', 'en');

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Climate change is affecting global weather patterns.');
  });

  it('should search across all challenges', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Tech',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'First tech topic here.',
        },
        {
          type: 'fill_blank',
          trend_topic: 'Space',
          prompt: 'test2',
          answer: 'test2',
          difficulty: 'medium',
          trending_context: 'Space exploration continues. Scientists discover new planets.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const result = await findContextualExamples('space', 'en');

    expect(result.length).toBeGreaterThan(0);
    expect(result.some((s) => s.includes('Space'))).toBe(true);
  });

  it('should deduplicate identical sentences', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Test',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'Climate change is urgent. Climate change is urgent.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const result = await findContextualExamples('climate', 'en');

    expect(result).toHaveLength(1);
  });

  it('should return empty array if word not found', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Test',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'This is about something else entirely.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const result = await findContextualExamples('quantum', 'en');

    expect(result).toEqual([]);
  });

  it('should use current date if no date provided', async () => {
    const today = new Date().toISOString().split('T')[0];
    mockGetDailyBuzz.mockResolvedValueOnce(null);

    await findContextualExamples('test', 'en');

    expect(mockGetDailyBuzz).toHaveBeenCalledWith(today, 'en');
  });

  it('should use provided date parameter', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce(null);

    await findContextualExamples('test', 'en', '2026-01-20');

    expect(mockGetDailyBuzz).toHaveBeenCalledWith('2026-01-20', 'en');
  });
});

describe('enrichVocabularyWithContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should add contextualExamples to word object', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Test',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'Technology is advancing rapidly.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const word = {
      word: 'technology',
      definition: 'The application of scientific knowledge',
    };

    const result = await enrichVocabularyWithContext(word, 'en');

    expect(result).toHaveProperty('contextualExamples');
    expect(result.contextualExamples).toHaveLength(1);
    expect(result.contextualExamples?.[0]).toBe('Technology is advancing rapidly.');
  });

  it('should preserve original word properties', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce(null);

    const word = {
      word: 'test',
      definition: 'A procedure to determine quality',
      partOfSpeech: 'noun',
      difficulty: 3,
    };

    const result = await enrichVocabularyWithContext(word, 'en');

    expect(result.word).toBe('test');
    expect(result.definition).toBe('A procedure to determine quality');
    expect(result.partOfSpeech).toBe('noun');
    expect(result.difficulty).toBe(3);
  });

  it('should return empty contextualExamples when no matches found', async () => {
    mockGetDailyBuzz.mockResolvedValueOnce({
      puzzle_date: '2026-01-29',
      language: 'en',
      region: 'US',
      trending_summary: 'News',
      trending_topics: [],
      challenges: [
        {
          type: 'anagram',
          trend_topic: 'Test',
          prompt: 'test',
          answer: 'test',
          difficulty: 'easy',
          trending_context: 'Something unrelated.',
        },
      ],
      ai_model: 'gpt-4',
      serp_api_response: {},
      image_url: null,
      image_prompt: null,
      image_category: null,
      image_alt_text: null,
      image_generation_cost_usd: 0,
      social_content: null,
    });

    const word = {
      word: 'quantum',
      definition: 'The smallest amount',
    };

    const result = await enrichVocabularyWithContext(word, 'en');

    expect(result.contextualExamples).toEqual([]);
  });

  it('should handle errors gracefully', async () => {
    mockGetDailyBuzz.mockRejectedValueOnce(new Error('Database error'));

    const word = {
      word: 'test',
      definition: 'A test definition',
    };

    const result = await enrichVocabularyWithContext(word, 'en');

    expect(result.contextualExamples).toEqual([]);
  });
});
