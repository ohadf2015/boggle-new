/**
 * Tests for SERP API enrichment toggle and budget-based auto-throttle
 * Verifies that enrichment is controlled by env var, feature flag, and budget monitor
 */

import { generateDailyBuzz } from '../buzzGenerator';
import * as vertexAIClient from '../vertexAIClient';
import * as challengeValidator from '../challengeValidator';
import * as trendsService from '../trendsService';
import * as serpApiClient from '../../serpApiClient';
import * as databaseService from '../databaseService';
import type { BuzzChallenge, TrendingTopic } from '../types';

// Mock all dependencies
jest.mock('../vertexAIClient');
jest.mock('../challengeValidator');
jest.mock('../trendsService');
jest.mock('../../serpApiClient');
jest.mock('../promptBuilder', () => ({
  buildAIPrompt: jest.fn(),
  buildAIPromptAsync: jest.fn().mockResolvedValue({
    prompt: 'Mock prompt',
    sectionsFromDatabase: [],
  }),
  buildSingleChallengePrompt: jest.fn(),
  buildPartialChallengePrompt: jest.fn(),
}));
jest.mock('../databaseService', () => ({
  storeDailyBuzz: jest.fn(),
  getDailyBuzz: jest.fn(),
  deleteDailyBuzz: jest.fn(),
  getRecentlyUsedTrends: jest.fn().mockResolvedValue([]),
  isFeatureFlagEnabled: jest.fn().mockResolvedValue(false),
  getPromptExamples: jest.fn().mockResolvedValue([]),
  storePromptExample: jest.fn(),
}));
jest.mock('../contentModerationService', () => ({
  filterTrendsWithAI: jest.fn().mockImplementation(async (trends) => ({
    approved: trends,
    rejected: [],
  })),
}));

const mockVertexAI = vertexAIClient as jest.Mocked<typeof vertexAIClient>;
const mockValidator = challengeValidator as jest.Mocked<typeof challengeValidator>;
const mockTrendsService = trendsService as jest.Mocked<typeof trendsService>;
const mockSerpApi = serpApiClient as jest.Mocked<typeof serpApiClient>;
const mockDb = databaseService as jest.Mocked<typeof databaseService>;

describe('Enrichment Toggle', () => {
  const mockTrends: TrendingTopic[] = Array.from({ length: 10 }, (_, i) => ({
    query: `trend${i}`,
    search_volume: 1000 * (i + 1),
  }));

  const mockChallenges: BuzzChallenge[] = Array.from({ length: 5 }, (_, i) => ({
    type: i === 0 ? 'wordle_guess' : 'riddle',
    trend_topic: `trend${i}`,
    prompt: `Prompt ${i}`,
    answer: `answer${i}`,
    hint: `hint${i}`,
    difficulty: 'easy' as const,
    trending_context: `context${i}`,
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.BUZZ_ENRICH_NEWS;
    delete process.env.SERP_MONTHLY_BUDGET;

    // Standard mock setup
    mockSerpApi.getTrendsFromDbCache.mockResolvedValue(null);
    mockSerpApi.fetchGoogleTrends.mockResolvedValue(mockTrends);
    mockSerpApi.storeTrendsInDbCache.mockResolvedValue();
    (mockSerpApi as any).getRemainingMonthlyBudget = jest.fn().mockResolvedValue(100);
    mockTrendsService.filterTrends.mockReturnValue(mockTrends);
    mockTrendsService.selectTrendsForChallenge.mockReturnValue(mockTrends.slice(0, 7));
    mockTrendsService.generateTrendingSummary.mockReturnValue('Test summary');
    mockVertexAI.getGeminiModel.mockReturnValue('gemini-2.5-pro');
    mockVertexAI.generateWithGemini.mockResolvedValue(JSON.stringify({ challenges: mockChallenges }));
    mockValidator.parseAIResponse.mockReturnValue({ challenges: mockChallenges, social_content: null });
    mockValidator.validateChallenges.mockReturnValue(mockChallenges);
    mockDb.isFeatureFlagEnabled.mockResolvedValue(false);
  });

  test('should NOT enrich when BUZZ_ENRICH_NEWS is unset (default OFF)', async () => {
    // GIVEN: No env var set, no feature flag

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN: fetchGoogleTrends called with enrichWithNews=false
    expect(mockSerpApi.fetchGoogleTrends).toHaveBeenCalledWith('US', 'en', false);
  });

  test('should enrich when BUZZ_ENRICH_NEWS=true', async () => {
    // GIVEN: Env var enables enrichment
    process.env.BUZZ_ENRICH_NEWS = 'true';

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN: fetchGoogleTrends called with enrichWithNews=true
    expect(mockSerpApi.fetchGoogleTrends).toHaveBeenCalledWith('US', 'en', true);
  });

  test('should NOT enrich when BUZZ_ENRICH_NEWS=false', async () => {
    // GIVEN
    process.env.BUZZ_ENRICH_NEWS = 'false';

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN
    expect(mockSerpApi.fetchGoogleTrends).toHaveBeenCalledWith('US', 'en', false);
  });

  test('should enrich when feature flag daily_buzz_enrichment is enabled', async () => {
    // GIVEN: Feature flag enabled (env var not set)
    mockDb.isFeatureFlagEnabled.mockImplementation(async (flag: string) => {
      if (flag === 'daily_buzz_enrichment') return true;
      return false;
    });

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN
    expect(mockSerpApi.fetchGoogleTrends).toHaveBeenCalledWith('US', 'en', true);
    expect(mockDb.isFeatureFlagEnabled).toHaveBeenCalledWith('daily_buzz_enrichment');
  });

  test('should auto-disable enrichment when nearing monthly budget', async () => {
    // GIVEN: Enrichment is enabled but budget is nearly exhausted
    process.env.BUZZ_ENRICH_NEWS = 'true';
    (mockSerpApi as any).getRemainingMonthlyBudget.mockResolvedValue(5); // Only 5 calls left, enrichment needs 10+

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN: enrichment should be auto-disabled due to budget
    expect(mockSerpApi.fetchGoogleTrends).toHaveBeenCalledWith('US', 'en', false);
  });

  test('should allow enrichment when budget has sufficient remaining calls', async () => {
    // GIVEN: Enrichment enabled AND budget has room
    process.env.BUZZ_ENRICH_NEWS = 'true';
    (mockSerpApi as any).getRemainingMonthlyBudget.mockResolvedValue(50);

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN: enrichment stays enabled
    expect(mockSerpApi.fetchGoogleTrends).toHaveBeenCalledWith('US', 'en', true);
  });

  test('should use cached trends and skip SERP API entirely when DB cache has data', async () => {
    // GIVEN: DB cache has trends
    mockSerpApi.getTrendsFromDbCache.mockResolvedValue(mockTrends);

    // WHEN
    await generateDailyBuzz(new Date('2026-02-08'), 'en');

    // THEN: fetchGoogleTrends should NOT be called (cached trends used)
    expect(mockSerpApi.fetchGoogleTrends).not.toHaveBeenCalled();
  });
});
