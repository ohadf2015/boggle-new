/**
 * Daily Buzz Challenge Generator - Orchestrator
 * Coordinates AI-powered word challenge generation from Google Trends
 * Uses Google Vertex AI Gemini for puzzle generation + Imagen for images
 */

import { getTrendsFromDbCache, fetchGoogleTrends, storeTrendsInDbCache, getRemainingMonthlyBudget } from '../serpApiClient';
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
 * Generate challenges using Google Vertex AI Gemini with retry logic
 *
 * Retries up to MAX_GENERATION_RETRIES times if validation fails.
 * Each retry includes feedback about rejected challenges to help AI generate better ones.
 */
async function generateChallengesWithAI(
  trends: TrendingTopic[],
  language: string,
  region: string
): Promise<AIGenerationResult> {
  const MAX_GENERATION_RETRIES = 3;
  const selectedTrends = selectTrendsForChallenge(trends);
  const examples = await getPromptExamples(language, 20);

  let lastError: Error | null = null;
  let lastRejectedCount = 0;
  let rejectionReasons: string[] = [];

  for (let attempt = 1; attempt <= MAX_GENERATION_RETRIES; attempt++) {
    try {
      // Build prompt with feedback from previous attempt (if any)
      let feedbackSection = '';
      if (attempt > 1 && rejectionReasons.length > 0) {
        feedbackSection = `\n\n---\n\n## IMPORTANT FEEDBACK FROM PREVIOUS ATTEMPT (ATTEMPT ${attempt}/${MAX_GENERATION_RETRIES})\n\n`;
        feedbackSection += `The previous generation had ${lastRejectedCount} rejected challenges:\n\n`;
        rejectionReasons.forEach((reason, idx) => {
          feedbackSection += `${idx + 1}. ${reason}\n`;
        });
        feedbackSection += `\nPlease generate ${5 + attempt * 2} challenges this time to ensure at least 5 pass validation.\n`;
        feedbackSection += `Focus on avoiding the issues listed above.\n`;
      }

      // Use async version to load database-customized templates
      const { prompt, sectionsFromDatabase } = await buildAIPromptAsync(trends, language, region, examples);
      const promptWithFeedback = prompt + feedbackSection;

      if (sectionsFromDatabase.length > 0 && attempt === 1) {
        console.log(`[BUZZ] Using ${sectionsFromDatabase.length} custom templates from database: ${sectionsFromDatabase.join(', ')}`);
      }

      console.log(`[BUZZ] Generation attempt ${attempt}/${MAX_GENERATION_RETRIES}...`);

      const responseText = await generateWithGemini(promptWithFeedback);
      const { challenges, social_content } = parseAIResponse(responseText);

      // Validate challenges - this will throw if insufficient
      const validatedChallenges = validateChallenges(challenges, language);

      // Success! Return the validated challenges
      if (attempt > 1) {
        console.log(`[BUZZ] ✅ Retry succeeded on attempt ${attempt}/${MAX_GENERATION_RETRIES}`);
      }

      return { challenges: validatedChallenges, selectedTrends, social_content };

    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Check if this is a retryable validation error
      const isInsufficientChallenges = errorMessage.includes('Insufficient validated challenges');
      const isMissingWordleGuess = errorMessage.includes('Daily Buzz must include at least one wordle_guess');

      if (isInsufficientChallenges || isMissingWordleGuess) {
        // Extract rejection count and reasons from error logs (if available)
        if (isInsufficientChallenges) {
          const match = errorMessage.match(/got (\d+), need 5/);
          if (match) {
            lastRejectedCount = 5 - parseInt(match[1], 10);
          }
        }

        // Collect specific rejection reasons for next attempt
        rejectionReasons = [];

        if (isMissingWordleGuess) {
          rejectionReasons.push(`CRITICAL: Missing required wordle_guess challenge - MUST include exactly ONE wordle_guess in your output`);
          lastRejectedCount = 1; // At least one challenge needs to be wordle_guess
        }

        if (isInsufficientChallenges) {
          rejectionReasons.push(`Invalid word length (too short or too long for ${language})`);
          rejectionReasons.push(`Answer spoiled in prompt or hint`);
          rejectionReasons.push(`Too many sports-related riddles`);
        }

        lastError = error instanceof Error ? error : new Error(errorMessage);

        // If we haven't exhausted retries, continue to next attempt
        if (attempt < MAX_GENERATION_RETRIES) {
          console.warn(`[BUZZ] Attempt ${attempt} failed: ${errorMessage}`);
          console.log(`[BUZZ] Retrying with feedback... (${attempt + 1}/${MAX_GENERATION_RETRIES})`);
          continue;
        }

        // Out of retries - throw the error
        console.error(`[BUZZ] All ${MAX_GENERATION_RETRIES} generation attempts failed`);
        throw lastError;
      }

      // Non-validation error (parsing, AI failure, etc.) - don't retry
      const errorStack = error instanceof Error ? error.stack : undefined;
      console.error('[BUZZ] AI generation failed:', errorMessage);
      if (errorStack) {
        console.error('[BUZZ] Error stack:', errorStack);
      }
      throw new Error(`Failed to generate challenges with AI: ${errorMessage}`);
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('All generation attempts failed');
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
        // Determine enrichment: env var OR feature flag, auto-disabled by budget monitor
        const enrichFlag = await isFeatureFlagEnabled('daily_buzz_enrichment');
        let enrichWithNews = enrichFlag || process.env.BUZZ_ENRICH_NEWS === 'true';

        // Auto-disable enrichment if nearing monthly budget (enrichment adds ~10 calls)
        if (enrichWithNews) {
          const remaining = await getRemainingMonthlyBudget();
          if (remaining < 11) {
            console.warn(`[BUZZ] Auto-disabling enrichment: only ${remaining} SERP calls remaining this month`);
            enrichWithNews = false;
          }
        }

        trends = await fetchGoogleTrends(region, language, enrichWithNews);
        if (!trends || trends.length === 0) {
          console.warn('[BUZZ] No trends returned from SERP API, will use fallback topics');
          trends = getFallbackTopics(language);
        } else {
          console.log(`[BUZZ] Fetched ${trends.length} fresh trends from SERP API${enrichWithNews ? ' (enriched with news)' : ''}`);
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

  // Step 5: Generate challenges with AI (includes validation with retry logic)
  console.log(`[BUZZ] Step 5: Starting AI challenge generation with ${filteredTrends.length} trends for ${language}/${region}...`);
  const { challenges: validatedChallenges, selectedTrends, social_content } = await generateChallengesWithAI(filteredTrends, language, region);
  console.log(`[BUZZ] Step 5: AI challenge generation completed with ${validatedChallenges.length} validated challenges`);

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
