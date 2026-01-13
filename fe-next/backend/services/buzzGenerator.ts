/**
 * Daily Buzz Challenge Generator
 * Orchestrates AI-powered word challenge generation from Google Trends
 * Uses Google Vertex AI Gemini for puzzle generation + Imagen for images
 */

import { VertexAI } from '@google-cloud/vertexai';
import { getTrendsFromDbCache, fetchGoogleTrends, TrendingTopic } from './serpApiClient';
import {
  generateChallengeImage,
  checkImageCache,
  categorizeTopic,
} from './imagenClient';

interface BuzzChallenge {
  type: 'anagram' | 'fill_blank' | 'word_chain' | 'definition_match' | 'trending_trio';
  trend_topic: string;
  prompt: string;
  answer: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  trending_context: string;
  options?: string[]; // For multiple choice challenges
}

interface DailyBuzzData {
  puzzle_date: string;
  language: string;
  region: string;
  trending_summary: string;
  trending_topics: TrendingTopic[];
  challenges: BuzzChallenge[];
  ai_model: string;
  serp_api_response: unknown;
  image_url: string | null;
  image_prompt: string | null;
  image_category: string | null;
  image_generation_cost_usd: number;
}

// Language to region mapping
const REGION_MAP: Record<string, string> = {
  en: 'US',
  he: 'IL',
  sv: 'SE',
  ja: 'JP',
  es: 'ES',
};

// Vertex AI Gemini configuration (using existing project credentials)
// Using most advanced model for high-quality puzzle generation
const GEMINI_MODEL = 'gemini-2.0-flash-thinking-exp-01-21'; // Most advanced Gemini model with extended thinking

/**
 * Generate Daily Buzz challenge for a specific date and language
 */
export async function generateDailyBuzz(
  date: Date,
  language: string,
  cachedTrends?: TrendingTopic[]
): Promise<DailyBuzzData> {
  console.log(`[BUZZ] Generating Daily Buzz for ${date.toISOString().split('T')[0]}, language: ${language}`);

  const region = REGION_MAP[language] || 'US';

  // Step 1: Get trending topics (from passed in, DB cache, or fresh fetch)
  let trends = cachedTrends;

  if (!trends) {
    // Try DB cache first
    trends = (await getTrendsFromDbCache(region, date)) ?? undefined;

    // If no cache, fetch fresh from SERP API
    if (!trends || trends.length === 0) {
      console.log('[BUZZ] No cached trends, fetching fresh from SERP API...');
      try {
        trends = await fetchGoogleTrends(region, language);
        if (!trends || trends.length === 0) {
          console.warn('[BUZZ] No trends returned from SERP API, will use fallback topics');
          trends = getFallbackTopics(language);
        } else {
          console.log(`[BUZZ] Fetched ${trends.length} fresh trends from SERP API`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[BUZZ] Failed to fetch trends from SERP API:', errorMessage);
        console.log('[BUZZ] Using fallback topics');
        trends = getFallbackTopics(language);
      }
    }
  }

  // Step 2: Filter and select appropriate trends
  const filteredTrends = filterTrends(trends, language);
  if (filteredTrends.length < 3) {
    console.error('[BUZZ] Insufficient trends after filtering');
    throw new Error('Not enough suitable trends for challenges');
  }

  // Step 3: Generate challenges with Claude Opus
  const challenges = await generateChallengesWithAI(filteredTrends, language, region);

  // Step 4: Validate challenges (ensure words exist in dictionary)
  const validatedChallenges = await validateChallenges(challenges, language);

  // Step 5: Generate hero image (feature flag checked inside)
  let imageUrl: string | null = null;
  let imagePrompt: string | null = null;
  let imageCategory: string | null = null;
  let imageCost = 0;

  try {
    const topTrend = filteredTrends[0];
    imageCategory = categorizeTopic(topTrend.query);

    // Check if feature is enabled (admin-only initially)
    const featureEnabled = await isFeatureFlagEnabled('daily_buzz_images');
    if (featureEnabled) {
      // Check cache first
      const cachedImage = await checkImageCache(topTrend.query);
      if (cachedImage) {
        imageUrl = cachedImage.url;
        console.log(`[BUZZ] Using cached image for: ${topTrend.query}`);
      } else {
        // Generate new image
        const imageResult = await generateChallengeImage(
          topTrend.query,
          imageCategory,
          language
        );
        imageUrl = imageResult.url;
        imagePrompt = imageResult.prompt;
        imageCost = imageResult.cost;
        console.log(`[BUZZ] Generated new image for: ${topTrend.query}`);
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Image generation failed:', errorMessage);
    // Continue without image - not critical
  }

  // Step 6: Store in database
  const buzzData: DailyBuzzData = {
    puzzle_date: date.toISOString().split('T')[0],
    language,
    region,
    trending_summary: generateTrendingSummary(filteredTrends),
    trending_topics: filteredTrends,
    challenges: validatedChallenges,
    ai_model: GEMINI_MODEL,
    serp_api_response: trends,
    image_url: imageUrl,
    image_prompt: imagePrompt,
    image_category: imageCategory,
    image_generation_cost_usd: imageCost,
  };

  await storeDailyBuzz(buzzData);

  console.log(`[BUZZ] Daily Buzz generated successfully with ${validatedChallenges.length} challenges`);
  return buzzData;
}

/**
 * Filter trending topics for family-friendly, word-game-suitable content
 */
function filterTrends(trends: TrendingTopic[], _language: string): TrendingTopic[] {
  // NSFW keywords to filter out (add more as needed)
  const bannedKeywords = [
    'porn',
    'xxx',
    'sex',
    'nude',
    'nsfw',
    'death',
    'kill',
    'murder',
    'suicide',
    'violence',
    'terrorist',
    'war crime',
  ];

  return trends
    .filter((trend) => {
      const query = trend.query.toLowerCase();

      // Filter out NSFW content
      if (bannedKeywords.some((keyword) => query.includes(keyword))) {
        return false;
      }

      // Filter out topics with insufficient context
      if (query.length < 3) {
        return false;
      }

      // Filter out pure numbers or very short phrases
      if (/^\d+$/.test(query)) {
        return false;
      }

      return true;
    })
    .slice(0, 10); // Keep top 10 filtered trends
}

interface GoogleCredentials {
  project_id: string;
  private_key: string;
  client_email: string;
}

/**
 * Get Vertex AI credentials from environment
 */
function getVertexAICredentials(): GoogleCredentials & { location: string } {
  const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;
  if (!credentialsJson) {
    throw new Error('GOOGLE_CREDENTIALS_JSON environment variable is not set');
  }

  try {
    const credentials = JSON.parse(credentialsJson) as GoogleCredentials;

    // Validate required fields
    const requiredFields: (keyof GoogleCredentials)[] = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required field in credentials: ${field}`);
      }
    }

    // Handle escaped newlines in private_key (common when pasting JSON)
    if (credentials.private_key.includes('\\n')) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    return {
      ...credentials,
      location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
    };
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Failed to parse GOOGLE_CREDENTIALS_JSON: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Generate challenges using Google Vertex AI Gemini
 */
async function generateChallengesWithAI(
  trends: TrendingTopic[],
  language: string,
  region: string
): Promise<BuzzChallenge[]> {
  const credentials = getVertexAICredentials();

  // Initialize Vertex AI client with explicit credentials (required for Railway/serverless deployment)
  const vertexAI = new VertexAI({
    project: credentials.project_id,
    location: credentials.location,
    googleAuthOptions: {
      credentials: {
        client_email: credentials.client_email,
        private_key: credentials.private_key,
      },
      projectId: credentials.project_id,
    },
  });

  const model = vertexAI.getGenerativeModel({
    model: GEMINI_MODEL,
  });

  const prompt = buildAIPrompt(trends, language, region);

  try {
    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.8, // Creative but not too random
        maxOutputTokens: 4000,
        topP: 0.9,
        topK: 40,
      },
    });

    // Parse AI response
    const response = result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!responseText) {
      throw new Error('No response text from Gemini');
    }

    const challenges = parseAIResponse(responseText);

    return challenges;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] AI generation failed:', errorMessage);
    throw new Error('Failed to generate challenges with AI');
  }
}

/**
 * Build prompt for Gemini to generate word challenges
 */
function buildAIPrompt(
  trends: TrendingTopic[],
  language: string,
  region: string
): string {
  const trendsContext = trends
    .slice(0, 5) // Use top 5 trends
    .map((trend, idx) => {
      // Use trend_breakdown for context, or category names as fallback
      const contextParts = trend.trend_breakdown?.slice(0, 3).join(', ') ||
        trend.categories?.map(c => c.name).join(', ') ||
        'Currently trending';
      const volumeDisplay = trend.search_volume
        ? `${(trend.search_volume / 1000).toFixed(0)}K+`
        : 'trending';
      return `${idx + 1}. "${trend.query}" - ${volumeDisplay} searches\n   Context: ${contextParts}`;
    })
    .join('\n\n');

  return `Generate a Daily Buzz word challenge for LexiClash, a neo-brutalist word game.

**Target Language**: ${language}
**Region**: ${region}
**Date**: ${new Date().toISOString().split('T')[0]}

**Trending Topics** (from Google Trends):
${trendsContext}

**Your Task**:
Create 5-7 word mini-challenges based on these trending topics. Each challenge should:
1. Use words EXTRACTED FROM or RELATED TO the trending topics
2. Be appropriate for family audiences (no profanity, violence, or sensitive topics)
3. Mix different puzzle formats (see types below)
4. Teach players about the trend while being fun
5. Have difficulty ranging from easy to medium
6. Work well in ${language} (culturally appropriate)

**Challenge Types** (use variety):
1. **anagram**: Unscramble a word related to the trend
2. **fill_blank**: Complete a phrase about the trend (show blanks as underscores)
3. **word_chain**: Connect two trend-related words by changing one letter at a time
4. **definition_match**: Match the word to its meaning (provide 4 options)
5. **trending_trio**: Find the word that connects all 3 trends

**Critical Requirements**:
- ALL answers must be SINGLE WORDS (no phrases or multi-word answers)
- Words should be 4-12 letters long
- Provide a helpful hint for each challenge
- Include trending context to educate players
- Neo-brutalist tone: bold, playful, punchy (avoid corporate speak)

**Output Format** (JSON only, no markdown):
{
  "date": "${new Date().toISOString().split('T')[0]}",
  "language": "${language}",
  "trending_summary": "Brief summary of top trends (max 60 chars)",
  "challenges": [
    {
      "type": "anagram",
      "trend_topic": "Name of trending topic",
      "prompt": "Unscramble tonight's golden word: TRSACE",
      "answer": "ACTRESS",
      "hint": "She walks the red carpet",
      "difficulty": "easy",
      "trending_context": "The 98th Academy Awards ceremony is tonight"
    },
    {
      "type": "fill_blank",
      "trend_topic": "Bitcoin hits record high",
      "prompt": "Bitcoin reached a _ _ _ _ _ _ milestone",
      "answer": "RECORD",
      "hint": "Never seen before",
      "difficulty": "medium",
      "trending_context": "Bitcoin surpassed $150K for the first time"
    },
    {
      "type": "definition_match",
      "trend_topic": "Polar Vortex",
      "prompt": "Which word describes the Arctic blast?",
      "answer": "VORTEX",
      "options": ["BREEZE", "VORTEX", "WARM", "CALM"],
      "hint": "Spinning weather pattern",
      "difficulty": "medium",
      "trending_context": "Record-breaking cold sweeps the Northeast"
    }
    // ... 4-6 more challenges
  ]
}

**Important**: Return ONLY the JSON object, no markdown formatting or code blocks.`;
}

/**
 * Parse AI response into structured challenges
 */
function parseAIResponse(responseText: string): BuzzChallenge[] {
  try {
    // Remove markdown code blocks if present
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
    }

    const parsed = JSON.parse(jsonText);

    if (!parsed.challenges || !Array.isArray(parsed.challenges)) {
      throw new Error('Invalid response format: missing challenges array');
    }

    // Validate each challenge
    const validChallenges = parsed.challenges.filter((challenge: Record<string, unknown>) => {
      return (
        challenge.type &&
        challenge.trend_topic &&
        challenge.prompt &&
        challenge.answer &&
        challenge.difficulty &&
        challenge.trending_context
      );
    });

    if (validChallenges.length < 5) {
      throw new Error('Insufficient valid challenges generated');
    }

    return validChallenges;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Failed to parse AI response:', errorMessage);
    console.error('[BUZZ] Raw response:', responseText.substring(0, 500));
    throw new Error('Failed to parse AI-generated challenges');
  }
}

/**
 * Validate challenges against game dictionary
 */
async function validateChallenges(
  challenges: BuzzChallenge[],
  language: string
): Promise<BuzzChallenge[]> {
  // Load dictionary for language
  const dictionary = await loadDictionary(language);

  const validatedChallenges = challenges.filter((challenge) => {
    const answer = challenge.answer.toUpperCase();

    // Check if answer exists in dictionary
    if (!dictionary.has(answer)) {
      console.warn(`[BUZZ] Word not in dictionary: ${answer}`);
      return false;
    }

    // Check word length
    if (answer.length < 3 || answer.length > 15) {
      console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters)`);
      return false;
    }

    // Validate options for multiple choice
    if (challenge.options) {
      const allValid = challenge.options.every((option) =>
        dictionary.has(option.toUpperCase())
      );
      if (!allValid) {
        console.warn(`[BUZZ] Invalid options for: ${challenge.prompt}`);
        return false;
      }
    }

    return true;
  });

  if (validatedChallenges.length < 5) {
    console.error('[BUZZ] Insufficient validated challenges');
    throw new Error('Too many invalid words generated by AI');
  }

  return validatedChallenges;
}

/**
 * Load game dictionary for validation
 */
async function loadDictionary(language: string): Promise<Set<string>> {
  try {
    let words: string[] = [];

    switch (language) {
      case 'en': {
        const enWords = await import('an-array-of-english-words');
        words = (enWords as { default?: string[] }).default || (enWords as unknown as string[]) || [];
        break;
      }
      case 'es': {
        const esWords = await import('an-array-of-spanish-words');
        words = (esWords as { default?: string[] }).default || (esWords as unknown as string[]) || [];
        break;
      }
      case 'sv': {
        const svWords = await import('@arvidbt/swedish-words');
        // Swedish words package exports as named export 'words', not default
        words = (svWords as { words?: string[] }).words || (svWords as unknown as string[]) || [];
        break;
      }
      case 'he':
      case 'ja': {
        // Load from custom dictionaries
        const fs = await import('fs/promises');
        const path = await import('path');
        const dictPath = path.join(
          process.cwd(),
          'backend',
          'dictionaries',
          `${language}.txt`
        );
        try {
          const content = await fs.readFile(dictPath, 'utf-8');
          words = content.split('\n').filter((w) => w.length > 0);
        } catch {
          console.warn(`[BUZZ] Dictionary file not found for ${language}, using empty set`);
          words = [];
        }
        break;
      }
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    if (!Array.isArray(words) || words.length === 0) {
      console.warn(`[BUZZ] No words loaded for language: ${language}`);
      return new Set();
    }

    return new Set(words.map((w) => w.toUpperCase()));
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Failed to load dictionary:', errorMessage);
    // Return empty set to fail validation gracefully
    return new Set();
  }
}

/**
 * Generate trending summary from topics
 */
function generateTrendingSummary(trends: TrendingTopic[]): string {
  const topTopics = trends.slice(0, 3).map((t) => t.query);
  return `Top trends: ${topTopics.join(', ')}`.substring(0, 100);
}

/**
 * Check if feature flag is enabled
 */
async function isFeatureFlagEnabled(flagName: string): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('feature_flags')
      .select('enabled, admin_only')
      .eq('flag_name', flagName)
      .single();

    if (error || !data) {
      return false;
    }

    // For now, just check if enabled (admin check will be in API routes)
    return data.enabled;
  } catch (error) {
    console.error('[BUZZ] Failed to check feature flag:', error);
    return false;
  }
}

/**
 * Store Daily Buzz in database
 */
async function storeDailyBuzz(buzzData: DailyBuzzData): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from('daily_buzz_challenges').upsert(
      {
        puzzle_date: buzzData.puzzle_date,
        language: buzzData.language,
        region: buzzData.region,
        trending_summary: buzzData.trending_summary,
        trending_topics: buzzData.trending_topics,
        challenges: buzzData.challenges,
        ai_model: buzzData.ai_model,
        serp_api_response: buzzData.serp_api_response,
        image_url: buzzData.image_url,
        image_prompt: buzzData.image_prompt,
        image_category: buzzData.image_category,
        image_generation_cost_usd: buzzData.image_generation_cost_usd,
      },
      {
        onConflict: 'puzzle_date,language,region',
      }
    );

    if (error) {
      throw new Error(`Failed to store Daily Buzz: ${error.message}`);
    }

    console.log(`[BUZZ] Stored Daily Buzz for ${buzzData.puzzle_date} (${buzzData.language})`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Failed to store Daily Buzz:', errorMessage);
    throw error;
  }
}

/**
 * Get fallback topics when SERP API fails or returns no results
 * Returns generic, family-friendly topics for word challenges
 * Uses correct SERP API response structure
 */
function getFallbackTopics(_language: string): TrendingTopic[] {
  const fallbackTopics: TrendingTopic[] = [
    {
      query: 'technology',
      search_volume: 100000,
      active: true,
      categories: [{ id: 5, name: 'Science & Technology' }],
      trend_breakdown: ['innovation', 'digital', 'software', 'computer']
    },
    {
      query: 'nature',
      search_volume: 80000,
      active: true,
      categories: [{ id: 8, name: 'Science' }],
      trend_breakdown: ['environment', 'wildlife', 'forest', 'ocean']
    },
    {
      query: 'music',
      search_volume: 90000,
      active: true,
      categories: [{ id: 3, name: 'Entertainment' }],
      trend_breakdown: ['melody', 'rhythm', 'concert', 'artist']
    },
    {
      query: 'science',
      search_volume: 75000,
      active: true,
      categories: [{ id: 8, name: 'Science' }],
      trend_breakdown: ['discovery', 'research', 'experiment', 'theory']
    },
    {
      query: 'travel',
      search_volume: 85000,
      active: true,
      categories: [{ id: 6, name: 'Travel' }],
      trend_breakdown: ['journey', 'destination', 'adventure', 'explore']
    }
  ];

  console.log(`[BUZZ] Using ${fallbackTopics.length} fallback topics`);
  return fallbackTopics;
}

/**
 * Get Daily Buzz for a specific date and language
 */
export async function getDailyBuzz(
  date: string,
  language: string
): Promise<DailyBuzzData | null> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const region = REGION_MAP[language] || 'US';

    const { data, error } = await supabase
      .from('daily_buzz_challenges')
      .select('*')
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('region', region)
      .single();

    if (error || !data) {
      return null;
    }

    return data as DailyBuzzData;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Failed to get Daily Buzz:', errorMessage);
    return null;
  }
}
