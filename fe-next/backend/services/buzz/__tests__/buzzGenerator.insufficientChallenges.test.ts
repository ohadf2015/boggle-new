/**
 * Test for insufficient challenges bug
 * When AI returns challenges but too many get rejected by validation,
 * the system should retry with better guidance instead of failing immediately
 */

import { generateDailyBuzz } from '../buzzGenerator';
import * as vertexAIClient from '../vertexAIClient';
import * as challengeValidator from '../challengeValidator';
import * as trendsService from '../trendsService';
import * as serpApiClient from '../../serpApiClient';
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
  filterTrendsWithAI: jest.fn().mockResolvedValue({
    approved: [
      { query: 'test1', traffic: 1000 },
      { query: 'test2', traffic: 2000 },
      { query: 'test3', traffic: 3000 },
      { query: 'test4', traffic: 4000 },
      { query: 'test5', traffic: 5000 },
      { query: 'test6', traffic: 6000 },
      { query: 'test7', traffic: 7000 },
      { query: 'test8', traffic: 8000 },
      { query: 'test9', traffic: 9000 },
      { query: 'test10', traffic: 10000 },
    ],
    rejected: [],
  }),
}));

const mockVertexAI = vertexAIClient as jest.Mocked<typeof vertexAIClient>;
const mockValidator = challengeValidator as jest.Mocked<typeof challengeValidator>;
const mockTrendsService = trendsService as jest.Mocked<typeof trendsService>;
const mockSerpApi = serpApiClient as jest.Mocked<typeof serpApiClient>;

describe('Insufficient Challenges Bug', () => {
  const mockTrends: TrendingTopic[] = Array.from({ length: 10 }, (_, i) => ({
    query: `trend${i}`,
    traffic: 1000 * (i + 1),
    articles: [],
  }));

  const createMockChallenge = (answer: string, length: number): BuzzChallenge => ({
    type: 'riddle',
    trend_topic: 'test',
    prompt: `Test prompt for ${answer}`,
    answer,
    hint: 'test hint',
    difficulty: 'easy',
    trending_context: 'test context',
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock trends fetching
    mockSerpApi.getTrendsFromDbCache.mockResolvedValue(null);
    mockSerpApi.fetchGoogleTrends.mockResolvedValue(mockTrends);
    mockTrendsService.filterTrends.mockReturnValue(mockTrends);
    mockTrendsService.selectTrendsForChallenge.mockReturnValue(mockTrends.slice(0, 7));
    mockTrendsService.generateTrendingSummary.mockReturnValue('Test summary');
    mockTrendsService.getFallbackTopics.mockReturnValue(mockTrends);

    // Mock Gemini model name
    mockVertexAI.getGeminiModel.mockReturnValue('gemini-2.5-pro');
  });

  test('should retry when validation rejects challenges', async () => {
    // GIVEN: AI returns challenges but validation will reject some
    const aiChallenges = [
      createMockChallenge('מכבי', 5),
      createMockChallenge('זיהום', 5),
      createMockChallenge('אריה', 4),
      createMockChallenge('לוסי', 4),
    ];

    // Mock parseAIResponse to return the challenges
    mockValidator.parseAIResponse.mockReturnValue({
      challenges: aiChallenges,
      social_content: null,
    });

    // Mock validateChallenges to throw error (simulating line 178 in challengeValidator.ts)
    mockValidator.validateChallenges.mockImplementation(() => {
      throw new Error('Insufficient validated challenges: got 4, need 5');
    });

    // Mock AI generation
    mockVertexAI.generateWithGemini.mockResolvedValue(
      JSON.stringify({ challenges: aiChallenges })
    );

    // WHEN: We try to generate daily buzz for Hebrew
    // THEN: It should fail after retrying 3 times
    await expect(
      generateDailyBuzz(new Date('2026-02-03'), 'he')
    ).rejects.toThrow('Insufficient validated challenges: got 4, need 5');

    // Verify retry happened - generateWithGemini was called 3 times (MAX_GENERATION_RETRIES)
    expect(mockVertexAI.generateWithGemini).toHaveBeenCalledTimes(3);

    // Verify feedback was included in retry attempts
    const secondCallPrompt = mockVertexAI.generateWithGemini.mock.calls[1][0];
    expect(secondCallPrompt).toContain('IMPORTANT FEEDBACK FROM PREVIOUS ATTEMPT');
    expect(secondCallPrompt).toContain('ATTEMPT 2/3');
  });

  test('should eventually succeed when retry succeeds with more challenges', async () => {
    let attemptCount = 0;

    // First attempt: AI returns 4 challenges, insufficient
    // Second attempt: AI returns 8 challenges, enough to pass
    mockVertexAI.generateWithGemini.mockImplementation(async () => {
      attemptCount++;

      if (attemptCount === 1) {
        // First attempt: Only 4 challenges (insufficient)
        return JSON.stringify({
          challenges: [
            createMockChallenge('מכבי', 5),
            createMockChallenge('זיהום', 5),
            createMockChallenge('אריה', 4),
            createMockChallenge('לוסי', 4),
          ],
        });
      } else {
        // Second attempt: 8 challenges (enough for at least 5 valid)
        return JSON.stringify({
          challenges: [
            createMockChallenge('מכבי', 5),
            createMockChallenge('זיהום', 5),
            createMockChallenge('אריה', 4),
            createMockChallenge('לוסי', 4),
            createMockChallenge('דניאל', 5),
            createMockChallenge('טבעת', 5),
            createMockChallenge('כדור', 4),
            createMockChallenge('משחק', 4),
          ],
        });
      }
    });

    // Mock parseAIResponse
    mockValidator.parseAIResponse.mockImplementation((responseText) => {
      const parsed = JSON.parse(responseText);
      return { challenges: parsed.challenges, social_content: null };
    });

    // Mock validateChallenges - fail on first attempt, succeed on second
    mockValidator.validateChallenges.mockImplementation((challenges) => {
      if (challenges.length < 5) {
        throw new Error(`Insufficient validated challenges: got ${challenges.length}, need 5`);
      }
      return challenges.slice(0, 7); // Limit to 7
    });

    // Should succeed after retry
    await expect(
      generateDailyBuzz(new Date('2026-02-03'), 'he')
    ).resolves.toBeDefined();

    // Should have retried once (2 total attempts)
    expect(attemptCount).toBe(2);

    // Second call should include feedback about rejection
    const secondCallPrompt = mockVertexAI.generateWithGemini.mock.calls[1][0];
    expect(secondCallPrompt).toContain('IMPORTANT FEEDBACK FROM PREVIOUS ATTEMPT');
    expect(secondCallPrompt).toContain('ATTEMPT 2/3');
  });

  test('should fail after max retries (3) to prevent infinite loop', async () => {
    // This test ensures the retry mechanism is bounded

    let attemptCount = 0;

    // Always return insufficient challenges
    mockVertexAI.generateWithGemini.mockImplementation(async () => {
      attemptCount++;
      return JSON.stringify({
        challenges: [
          createMockChallenge('מכבי', 5),
          createMockChallenge('זיהום', 5),
        ],
      });
    });

    mockValidator.parseAIResponse.mockImplementation((responseText) => {
      const parsed = JSON.parse(responseText);
      return { challenges: parsed.challenges, social_content: null };
    });

    mockValidator.validateChallenges.mockImplementation(() => {
      throw new Error('Insufficient validated challenges: got 2, need 5');
    });

    // Should fail after max retries
    await expect(
      generateDailyBuzz(new Date('2026-02-03'), 'he')
    ).rejects.toThrow('Insufficient validated challenges');

    // Should have tried MAX_GENERATION_RETRIES times (3)
    expect(attemptCount).toBe(3);

    // Each retry should include feedback
    const secondCallPrompt = mockVertexAI.generateWithGemini.mock.calls[1][0];
    expect(secondCallPrompt).toContain('ATTEMPT 2/3');

    const thirdCallPrompt = mockVertexAI.generateWithGemini.mock.calls[2][0];
    expect(thirdCallPrompt).toContain('ATTEMPT 3/3');
  });
});
