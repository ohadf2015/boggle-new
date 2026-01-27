/**
 * Daily Buzz Challenge Generator - Orchestrator
 * Coordinates AI-powered word challenge generation from Google Trends
 * Uses Google Vertex AI Gemini for puzzle generation + Imagen for images
 */

import { getTrendsFromDbCache, fetchGoogleTrends, storeTrendsInDbCache } from '../serpApiClient';
import {
  generateChallengeImage,
  checkImageCache,
  categorizeTopic,
} from '../imagenClient';

import { REGION_MAP, REGEN_FUNCTION_TIMEOUT_MS } from './constants';
import type {
  AIGenerationResult,
  BuzzChallenge,
  DailyBuzzData,
  GenerateDailyBuzzOptions,
  PartialRegenerationOptions,
  PromptExample,
  RegenerableField,
  TrendingTopic,
} from './types';
import { withTimeout } from './utils';
import {
  filterTrends,
  generateTrendingSummary,
  getFallbackTopics,
  selectTrendsForChallenge,
} from './trendsService';
import { filterTrendsWithAI } from './contentModerationService';
import { generateWithGemini, generateSingleChallengeWithAI, getGeminiModel } from './vertexAIClient';
import { validateChallenges, validateSingleChallenge, parseAIResponse } from './challengeValidator';
import {
  buildAIPrompt,
  buildAIPromptAsync,
  buildSingleChallengePrompt,
  buildPartialChallengePrompt,
} from './promptBuilder';
import {
  storeDailyBuzz,
  getDailyBuzz,
  deleteDailyBuzz,
  getRecentlyUsedTrends,
  isFeatureFlagEnabled,
  getPromptExamples,
  storePromptExample,
} from './databaseService';

// Re-export types
export type { BuzzChallenge, DailyBuzzData, GenerateDailyBuzzOptions, PromptExample, RegenerableField, PartialRegenerationOptions };

// Re-export database functions
export { getDailyBuzz, deleteDailyBuzz, getPromptExamples, storePromptExample };

/**
 * Generate challenges using Google Vertex AI Gemini
 */
async function generateChallengesWithAI(
  trends: TrendingTopic[],
  language: string,
  region: string
): Promise<AIGenerationResult> {
  const selectedTrends = selectTrendsForChallenge(trends);
  const examples = await getPromptExamples(language, 20);

  // Use async version to load database-customized templates
  const { prompt, sectionsFromDatabase } = await buildAIPromptAsync(trends, language, region, examples);

  if (sectionsFromDatabase.length > 0) {
    console.log(`[BUZZ] Using ${sectionsFromDatabase.length} custom templates from database: ${sectionsFromDatabase.join(', ')}`);
  }

  try {
    const responseText = await generateWithGemini(prompt);
    const { challenges, social_content } = parseAIResponse(responseText);
    return { challenges, selectedTrends, social_content };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] AI generation failed:', errorMessage);
    if (errorMessage.includes('timed out')) {
      throw new Error(errorMessage);
    }
    throw new Error('Failed to generate challenges with AI');
  }
}

/**
 * Generate Daily Buzz challenge for a specific date and language
 *
 * @param date - Target date for the challenge
 * @param language - Language code (en, he, sv, ja, es)
 * @param options - Generation options (cachedTrends, deleteBeforeRegenerate)
 */
export async function generateDailyBuzz(
  date: Date,
  language: string,
  options?: GenerateDailyBuzzOptions | TrendingTopic[]
): Promise<DailyBuzzData> {
  // Handle legacy signature: generateDailyBuzz(date, language, cachedTrends)
  const opts: GenerateDailyBuzzOptions = Array.isArray(options)
    ? { cachedTrends: options }
    : options || {};

  const dateStr = date.toISOString().split('T')[0];
  console.log(`[BUZZ] Generating Daily Buzz for ${dateStr}, language: ${language}`);

  const region = REGION_MAP[language] || 'US';

  // Step 0: Delete existing challenge if requested
  if (opts.deleteBeforeRegenerate) {
    console.log(`[BUZZ] Deleting existing challenge before regeneration...`);
    await deleteDailyBuzz(dateStr, language);
  }

  // Step 1: Get trending topics
  let trends = opts.cachedTrends;

  if (!trends) {
    trends = (await getTrendsFromDbCache(region, date)) ?? undefined;

    if (!trends || trends.length === 0) {
      console.log('[BUZZ] No cached trends, fetching fresh from SERP API...');
      try {
        trends = await fetchGoogleTrends(region, language);
        if (!trends || trends.length === 0) {
          console.warn('[BUZZ] No trends returned from SERP API, will use fallback topics');
          trends = getFallbackTopics(language);
        } else {
          console.log(`[BUZZ] Fetched ${trends.length} fresh trends from SERP API`);
          // Store in DB cache for future use (fire and forget)
          storeTrendsInDbCache(region, date, trends, 0).catch(err =>
            console.error('[BUZZ] Failed to store trends in DB cache:', err)
          );
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[BUZZ] Failed to fetch trends from SERP API:', errorMessage);
        console.log('[BUZZ] Using fallback topics');
        trends = getFallbackTopics(language);
      }
    }
  }

  // Step 2: AI Content Moderation - Filter for child-friendly and non-political content
  // This runs BEFORE keyword-based filtering to ensure inappropriate content is removed early
  console.log(`[BUZZ] Running AI content moderation on ${trends.length} trends...`);
  const moderationResult = await filterTrendsWithAI(trends, language);

  if (moderationResult.rejected.length > 0) {
    console.log(`[BUZZ] AI moderation rejected ${moderationResult.rejected.length} trends:`);
    moderationResult.rejected.forEach(r =>
      console.log(`  - "${r.topic.query}" (${r.category}: ${r.reason})`)
    );
  }

  // Use only AI-approved trends for further processing
  let moderatedTrends = moderationResult.approved;

  // If AI moderation filtered out too many, include some rejected ones as fallback
  if (moderatedTrends.length < 5 && trends.length > moderatedTrends.length) {
    console.warn(`[BUZZ] AI moderation left only ${moderatedTrends.length} trends, may need fallback`);
  }

  // Step 3: Fetch recently used trends to avoid repetition
  const recentlyUsedTrends = await getRecentlyUsedTrends(language, 7);

  // Step 4: Apply keyword-based filtering (NSFW, sports limits, script matching)
  let filteredTrends = filterTrends(moderatedTrends, language, recentlyUsedTrends);
  if (filteredTrends.length < 3) {
    console.error('[BUZZ] Insufficient trends after filtering');
    console.log('[BUZZ] Retrying without deduplication filter...');
    const fallbackFiltered = filterTrends(moderatedTrends, language);
    if (fallbackFiltered.length < 3) {
      // Last resort: try with original trends (before AI moderation) minus recently used
      console.log('[BUZZ] Trying with original trends as last fallback...');
      const originalFiltered = filterTrends(trends, language, recentlyUsedTrends);
      if (originalFiltered.length < 3) {
        throw new Error('Not enough suitable trends for challenges');
      }
      console.log(`[BUZZ] Using original trends fallback (${originalFiltered.length} trends)`);
      filteredTrends = originalFiltered;
    } else {
      console.log(`[BUZZ] Using fallback filter (${fallbackFiltered.length} trends)`);
      filteredTrends = fallbackFiltered;
    }
  }

  // Step 5: Generate challenges with AI
  const { challenges, selectedTrends, social_content } = await generateChallengesWithAI(filteredTrends, language, region);

  // Step 6: Validate challenges
  const validatedChallenges = validateChallenges(challenges, language);

  // Step 7: Generate hero image
  let imageUrl: string | null = null;
  let imagePrompt: string | null = null;
  let imageCategory: string | null = null;
  let imageAltText: string | null = null;
  let imageCost = 0;

  try {
    const topTrend = selectedTrends[0];
    imageCategory = categorizeTopic(topTrend.query);

    const featureEnabled = await isFeatureFlagEnabled('daily_buzz_images');
    if (featureEnabled) {
      const cachedImage = await checkImageCache(topTrend.query);
      if (cachedImage) {
        imageUrl = cachedImage.url;
        imageAltText = `Trending topic: ${topTrend.query} - Google Trends visualization in ${imageCategory} category`;
        console.log(`[BUZZ] Using cached image for: ${topTrend.query}`);
      } else {
        const imageResult = await generateChallengeImage(
          topTrend.query,
          imageCategory,
          language
        );
        imageUrl = imageResult.url;
        imagePrompt = imageResult.prompt;
        imageAltText = imageResult.altText;
        imageCost = imageResult.cost;
        console.log(`[BUZZ] Generated new image for: ${topTrend.query}`);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Image generation failed:', errorMessage);
  }

  // Step 8: Store in database
  const buzzData: DailyBuzzData = {
    puzzle_date: date.toISOString().split('T')[0],
    language,
    region,
    trending_summary: generateTrendingSummary(filteredTrends),
    trending_topics: filteredTrends,
    challenges: validatedChallenges,
    ai_model: getGeminiModel(),
    serp_api_response: trends,
    image_url: imageUrl,
    image_prompt: imagePrompt,
    image_category: imageCategory,
    image_alt_text: imageAltText,
    image_generation_cost_usd: imageCost,
    social_content: social_content,
  };

  await storeDailyBuzz(buzzData);

  console.log(`[BUZZ] Daily Buzz generated successfully with ${validatedChallenges.length} challenges`);
  return buzzData;
}

/**
 * Regenerate a single challenge within an existing Daily Buzz
 */
export async function regenerateSingleChallenge(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string
): Promise<DailyBuzzData> {
  return withTimeout(
    regenerateSingleChallengeInternal(date, language, challengeIndex, feedback),
    REGEN_FUNCTION_TIMEOUT_MS,
    'Challenge regeneration'
  );
}

async function regenerateSingleChallengeInternal(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string
): Promise<DailyBuzzData> {
  console.log(`[BUZZ] Regenerating challenge ${challengeIndex} for ${date}/${language}`);

  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  if (challengeIndex < 0 || challengeIndex >= existing.challenges.length) {
    throw new Error(`Invalid challenge index: ${challengeIndex}. Valid range: 0-${existing.challenges.length - 1}`);
  }

  const badChallenge = existing.challenges[challengeIndex];
  console.log(`[BUZZ] Original challenge: ${badChallenge.type} - "${badChallenge.answer}"`);

  const regenerationPrompt = buildSingleChallengePrompt(
    badChallenge,
    feedback,
    language,
    existing.trending_topics
  );

  const newChallenge = await generateSingleChallengeWithAI(regenerationPrompt);
  console.log(`[BUZZ] New challenge generated: ${newChallenge.type} - "${newChallenge.answer}"`);

  if (!validateSingleChallenge(newChallenge, language)) {
    throw new Error('Regenerated challenge failed validation - try different feedback');
  }

  const updatedChallenges = [...existing.challenges];
  updatedChallenges[challengeIndex] = newChallenge;

  const updatedData: DailyBuzzData = {
    ...existing,
    challenges: updatedChallenges,
  };

  await storeDailyBuzz(updatedData);

  console.log(`[BUZZ] Challenge ${challengeIndex} regenerated successfully`);
  return updatedData;
}

/**
 * Regenerate all challenges of a specific type within an existing Daily Buzz
 */
export async function regenerateChallengesByType(
  date: string,
  language: string,
  challengeType: string,
  feedback: string
): Promise<DailyBuzzData> {
  return withTimeout(
    regenerateChallengesByTypeInternal(date, language, challengeType, feedback),
    REGEN_FUNCTION_TIMEOUT_MS,
    'Challenges-by-type regeneration'
  );
}

async function regenerateChallengesByTypeInternal(
  date: string,
  language: string,
  challengeType: string,
  feedback: string
): Promise<DailyBuzzData> {
  console.log(`[BUZZ] Regenerating all ${challengeType} challenges for ${date}/${language}`);

  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  const indicesToRegenerate: number[] = [];
  existing.challenges.forEach((challenge, index) => {
    if (challenge.type === challengeType) {
      indicesToRegenerate.push(index);
    }
  });

  if (indicesToRegenerate.length === 0) {
    throw new Error(`No challenges of type "${challengeType}" found in the daily buzz`);
  }

  console.log(`[BUZZ] Found ${indicesToRegenerate.length} ${challengeType} challenge(s) to regenerate`);

  const updatedChallenges = [...existing.challenges];

  for (const index of indicesToRegenerate) {
    const badChallenge = existing.challenges[index];
    console.log(`[BUZZ] Regenerating ${challengeType} at index ${index}: "${badChallenge.answer}"`);

    const regenerationPrompt = buildSingleChallengePrompt(
      badChallenge,
      feedback,
      language,
      existing.trending_topics
    );

    const newChallenge = await generateSingleChallengeWithAI(regenerationPrompt);
    console.log(`[BUZZ] New ${challengeType} generated: "${newChallenge.answer}"`);

    if (!validateSingleChallenge(newChallenge, language)) {
      throw new Error(`Regenerated ${challengeType} challenge failed validation - try different feedback`);
    }

    updatedChallenges[index] = newChallenge;
  }

  const updatedData: DailyBuzzData = {
    ...existing,
    challenges: updatedChallenges,
  };

  await storeDailyBuzz(updatedData);

  console.log(`[BUZZ] Regenerated ${indicesToRegenerate.length} ${challengeType} challenge(s) successfully`);
  return updatedData;
}

/**
 * Get a preview of the AI prompt that would be sent for regeneration
 */
export async function getPromptPreview(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string,
  fieldsToRegenerate: RegenerableField[] = ['all']
): Promise<{ prompt: string; examples: PromptExample[] }> {
  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  if (challengeIndex < 0 || challengeIndex >= existing.challenges.length) {
    throw new Error(`Invalid challenge index: ${challengeIndex}`);
  }

  const challenge = existing.challenges[challengeIndex];
  const examples = await getPromptExamples(language, 20);

  const prompt = buildPartialChallengePrompt(
    challenge,
    feedback,
    language,
    fieldsToRegenerate,
    existing.trending_topics,
    examples
  );

  return { prompt, examples };
}

/**
 * Regenerate specific fields of a challenge within an existing Daily Buzz
 */
export async function regeneratePartialChallenge(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string,
  options: PartialRegenerationOptions
): Promise<DailyBuzzData> {
  return withTimeout(
    regeneratePartialChallengeInternal(date, language, challengeIndex, feedback, options),
    REGEN_FUNCTION_TIMEOUT_MS,
    'Challenge regeneration'
  );
}

async function regeneratePartialChallengeInternal(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string,
  options: PartialRegenerationOptions
): Promise<DailyBuzzData> {
  const { fields = ['all'], customPrompt } = options;
  const isFullRegeneration = fields.includes('all');

  console.log(`[BUZZ] ${isFullRegeneration ? 'Full' : 'Partial'} regeneration for challenge ${challengeIndex} (${date}/${language}), fields: ${fields.join(', ')}`);

  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  if (challengeIndex < 0 || challengeIndex >= existing.challenges.length) {
    throw new Error(`Invalid challenge index: ${challengeIndex}. Valid range: 0-${existing.challenges.length - 1}`);
  }

  const originalChallenge = existing.challenges[challengeIndex];
  console.log(`[BUZZ] Original challenge: ${originalChallenge.type} - "${originalChallenge.answer}"`);

  let regenerationPrompt: string;

  if (customPrompt) {
    if (!customPrompt.includes(feedback)) {
      regenerationPrompt = `${customPrompt}

---

## CURRENT ADMIN FEEDBACK (IMPORTANT - must address this)
${feedback}
`;
      console.log(`[BUZZ] Using custom prompt override with appended feedback`);
    } else {
      regenerationPrompt = customPrompt;
      console.log(`[BUZZ] Using custom prompt override`);
    }
  } else {
    const examples = await getPromptExamples(language, 20);

    regenerationPrompt = buildPartialChallengePrompt(
      originalChallenge,
      feedback,
      language,
      fields,
      existing.trending_topics,
      examples
    );
  }

  const newChallenge = await generateSingleChallengeWithAI(regenerationPrompt);
  console.log(`[BUZZ] New challenge generated: ${newChallenge.type} - "${newChallenge.answer}"`);

  if (!validateSingleChallenge(newChallenge, language)) {
    throw new Error('Regenerated challenge failed validation - try different feedback');
  }

  let finalChallenge: BuzzChallenge;

  if (isFullRegeneration) {
    finalChallenge = newChallenge;
  } else {
    finalChallenge = {
      ...originalChallenge,
      ...(fields.includes('prompt') ? { prompt: newChallenge.prompt } : {}),
      ...(fields.includes('answer') ? { answer: newChallenge.answer } : {}),
      ...(fields.includes('hint') ? { hint: newChallenge.hint } : {}),
      ...(fields.includes('options') && newChallenge.options ? { options: newChallenge.options } : {}),
    };
  }

  const updatedChallenges = [...existing.challenges];
  updatedChallenges[challengeIndex] = finalChallenge;

  const updatedData: DailyBuzzData = {
    ...existing,
    challenges: updatedChallenges,
  };

  await storeDailyBuzz(updatedData);

  console.log(`[BUZZ] Challenge ${challengeIndex} ${isFullRegeneration ? 'fully' : 'partially'} regenerated successfully`);
  return updatedData;
}
