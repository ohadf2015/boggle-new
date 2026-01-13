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
// Dictionary imports removed - Buzz challenges don't validate against game dictionary

interface BuzzChallenge {
  type: 'anagram' | 'fill_blank' | 'word_chain' | 'definition_match' | 'trending_trio' | 'riddle';
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
const GEMINI_MODEL = process.env.VERTEX_AI_MODEL || 'gemini-2.5-pro';

/**
 * Generate Daily Buzz challenge for a specific date and language
 *
 * @param date - Target date for the challenge
 * @param language - Language code (en, he, sv, ja, es)
 * @param cachedTrends - INTERNAL USE ONLY. Pre-fetched trends for batch processing.
 *                       DO NOT expose this parameter through any API endpoint.
 *                       Allowing external callers to pass custom trends would enable
 *                       partial overrides and bypass the trend fetching security model.
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

  // Step 4: Validate challenges (basic sanity checks, no dictionary validation)
  const validatedChallenges = validateChallenges(challenges, language);

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
      location: process.env.GCP_LOCATION || process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
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
        maxOutputTokens: 8000, // Increased to prevent truncation (Hebrew/Japanese responses are longer)
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

  // Language-specific examples
  const langExamples = language === 'he' ? `
**Hebrew Word Examples by Trend**:
- Trend about Iran/conflict → מלחמה (war), שלום (peace), הגנה (defense), טיל (missile), התקפה (attack), צבא (army)
- Trend about weather → גשם (rain), שלג (snow), קור (cold), סערה (storm), רוח (wind)
- Trend about sports → כדורגל (soccer), נצחון (victory), גביע (trophy), שער (goal)
- Trend about politics → בחירות (elections), ממשלה (government), חוק (law), מדינה (state)
- Trend about economy → כסף (money), בנק (bank), מחיר (price), שוק (market)` : `
**Word Examples by Trend**:
- Trend about conflict/war → WAR, PEACE, DEFENSE, MISSILE, ATTACK, ARMY, BATTLE, TREATY
- Trend about weather → RAIN, SNOW, COLD, STORM, WIND, HEAT, FLOOD, FREEZE
- Trend about sports → SOCCER, VICTORY, TROPHY, GOAL, MATCH, SCORE, CHAMPION
- Trend about politics → ELECTION, VOTE, LAW, STATE, LEADER, DEBATE, POLICY
- Trend about economy → MONEY, BANK, PRICE, MARKET, TRADE, STOCK, PROFIT`;

  return `Generate a Daily Buzz word challenge for LexiClash, a neo-brutalist word game.

**Target Language**: ${language}
**Region**: ${region}
**Date**: ${new Date().toISOString().split('T')[0]}

**TODAY'S TRENDING TOPICS** (from Google Trends - DIRECTLY USE these for challenges):
${trendsContext}

**Your Task**:
Create 5-7 word mini-challenges that are DIRECTLY CONNECTED to today's trending topics. Players should feel "this is what everyone is talking about today!"

**CRITICAL - Connect Challenges to ACTUAL Trends**:
1. Each challenge MUST relate to one of the trending topics above
2. Use COMMON DICTIONARY WORDS that are semantically connected to the trend
3. The clue/prompt should REFERENCE the trending topic or current event
4. The "trending_context" should explain WHY this trend is popular NOW
${langExamples}

**Word Selection Rules**:
1. NEVER use brand names (no "Nike", "Apple", "Netflix", "Tesla", etc.)
2. NEVER use celebrity names, company names, or country names AS ANSWERS
3. Answers must be COMMON DICTIONARY WORDS (nouns, verbs, adjectives)
4. Words should be 3-12 letters
5. You CAN reference proper nouns in CLUES, just not as answers
   - Good: "Clue: What nations seek after conflict | Answer: PEACE"
   - Bad: "Answer: IRAN" (proper noun)

**Challenge Types** (use variety):
1. **anagram**: CLUE that references the trend + scrambled letters
   - Format: "[Trend-related clue] | Letters: XXXXX"
   - Example for Iran trend: "What diplomats negotiate for | Letters: EACEP" → PEACE
2. **fill_blank**: Phrase connected to trending news
   - Example: "Nations called for immediate _ _ _ _ _ _ _ _" → CEASEFIRE
3. **word_chain**: Connect two trend-related words
4. **definition_match**: Trend-related word with 4 options
5. **riddle**: SOPHISTICATED riddles requiring LATERAL THINKING (this is the premium challenge type!)
   - Use paradoxes, contradictions, and clever word associations
   - Incorporate double meanings, metaphors, and abstract concepts
   - The riddle should make the solver THINK deeply, not just recall definitions
   - Connect to current trends through metaphor, not literal description

   **Riddle Techniques to Use**:
   - Personification: Give abstract concepts human traits ("I am born in conflict...")
   - Paradox: Seemingly contradictory statements ("I grow stronger when broken...")
   - Sensory misdirection: Describe one sense to mean another ("I speak without a mouth...")
   - Time/space manipulation: Play with temporal concepts ("I exist before I arrive...")
   - Dual meaning: Words that work on multiple levels

   **Sophisticated Riddle Examples**:
   - "I am the child of two enemies, yet I end their fight. Nations celebrate my birth, but work hard for my life. What am I?" → PEACE
   - "I travel faster than sound, carry words without speaking, and connect strangers instantly. Yet I have no body. What am I?" → SIGNAL
   - "I can topple governments without touching them, spread across borders without papers, and change minds without speaking. What am I?" → NEWS
   - "I am invisible but measured, wasted by many but saved by none. Leaders fear my passage. What am I?" → TIME
   - "I fly without wings, destroy without hands, and nations fear my launch. Born from science, I bring only fire. What am I?" → MISSILE

**Output Format** (JSON only, no markdown):
{
  "date": "${new Date().toISOString().split('T')[0]}",
  "language": "${language}",
  "trending_summary": "Today: [actual trending theme] (max 60 chars)",
  "challenges": [
    {
      "type": "anagram",
      "trend_topic": "[Actual trend from above]",
      "prompt": "[Trend-connected clue] | Letters: XXXXX",
      "answer": "[DICTIONARY WORD]",
      "hint": "[Brief hint]",
      "difficulty": "easy|medium|hard",
      "trending_context": "[Why this trend matters TODAY]"
    }
  ]
}

**Important**:
- Return ONLY the JSON object, no markdown formatting or code blocks
- Make challenges feel CURRENT and RELEVANT to today's news
- The trending_context should explain the actual current event
- Include AT LEAST 2 sophisticated riddles per challenge set
- Riddles should be the HIGHLIGHT - make them clever enough to be memorable
- Think step-by-step when crafting riddles: what paradox or metaphor captures this concept?`;
}

/**
 * Attempt to repair truncated JSON by closing open structures
 * This handles cases where AI response is cut off mid-generation
 */
function repairTruncatedJson(jsonText: string): string {
  // Count open braces/brackets
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;

  for (const char of jsonText) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }
    if (char === '\\') {
      escapeNext = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (char === '{') openBraces++;
    if (char === '}') openBraces--;
    if (char === '[') openBrackets++;
    if (char === ']') openBrackets--;
  }

  // If we ended inside a string, close it
  if (inString) {
    jsonText += '"';
  }

  // Find last complete challenge object by looking for last complete "trending_context"
  const lastCompleteChallenge = jsonText.lastIndexOf('"trending_context"');
  if (lastCompleteChallenge > 0) {
    // Find the end of this challenge's value
    const afterContext = jsonText.indexOf('"', lastCompleteChallenge + 18); // Skip past "trending_context": "
    if (afterContext > 0) {
      const closingQuote = jsonText.indexOf('"', afterContext + 1);
      if (closingQuote > 0) {
        // Truncate to end of last complete challenge
        const afterClosingQuote = closingQuote + 1;
        // Find next } that closes the challenge object
        let braceCount = 0;
        let foundClose = -1;
        for (let i = afterClosingQuote; i < jsonText.length; i++) {
          if (jsonText[i] === '{') braceCount++;
          if (jsonText[i] === '}') {
            if (braceCount === 0) {
              foundClose = i;
              break;
            }
            braceCount--;
          }
        }
        if (foundClose > 0) {
          jsonText = jsonText.substring(0, foundClose + 1) + ']}';
          console.log('[BUZZ] Repaired truncated JSON by finding last complete challenge');
          return jsonText;
        }
      }
    }
  }

  // Fallback: close remaining brackets/braces
  jsonText += ']'.repeat(Math.max(0, openBrackets));
  jsonText += '}'.repeat(Math.max(0, openBraces));

  console.log('[BUZZ] Repaired truncated JSON with bracket closing');
  return jsonText;
}

/**
 * Parse AI response into structured challenges
 */
function parseAIResponse(responseText: string): BuzzChallenge[] {
  // Remove markdown code blocks if present
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
  }

  // First attempt: direct parse
  let parsed: { challenges?: BuzzChallenge[] };
  try {
    parsed = JSON.parse(jsonText);
  } catch (firstError: unknown) {
    const firstErrorMsg = firstError instanceof Error ? firstError.message : 'Unknown error';
    console.warn('[BUZZ] Initial JSON parse failed:', firstErrorMsg);

    // Check if it's a truncation error
    if (firstErrorMsg.includes('Unterminated') || firstErrorMsg.includes('Unexpected end')) {
      console.log('[BUZZ] Attempting to repair truncated JSON...');
      const repaired = repairTruncatedJson(jsonText);

      try {
        parsed = JSON.parse(repaired);
        console.log('[BUZZ] Successfully parsed repaired JSON');
      } catch (repairError: unknown) {
        const repairErrorMsg = repairError instanceof Error ? repairError.message : 'Unknown error';
        console.error('[BUZZ] Failed to parse repaired JSON:', repairErrorMsg);
        console.error('[BUZZ] Raw response (first 500 chars):', responseText.substring(0, 500));
        throw new Error(`Failed to parse AI-generated challenges: ${firstErrorMsg}`);
      }
    } else {
      console.error('[BUZZ] Failed to parse AI response:', firstErrorMsg);
      console.error('[BUZZ] Raw response (first 500 chars):', responseText.substring(0, 500));
      throw new Error(`Failed to parse AI-generated challenges: ${firstErrorMsg}`);
    }
  }

  if (!parsed.challenges || !Array.isArray(parsed.challenges)) {
    throw new Error('Invalid response format: missing challenges array');
  }

  // Validate each challenge
  const validChallenges = parsed.challenges.filter((challenge: Partial<BuzzChallenge>) => {
    return (
      challenge.type &&
      challenge.trend_topic &&
      challenge.prompt &&
      challenge.answer &&
      challenge.difficulty &&
      challenge.trending_context
    );
  }) as BuzzChallenge[];

  if (validChallenges.length < 5) {
    throw new Error(`Insufficient valid challenges: got ${validChallenges.length}, need 5`);
  }

  return validChallenges;
}

// Common brand names and proper nouns to filter out (case-insensitive)
const BANNED_BRAND_WORDS = new Set([
  'APPLE', 'GOOGLE', 'AMAZON', 'NETFLIX', 'TESLA', 'NIKE', 'ADIDAS',
  'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'TWITTER', 'YOUTUBE', 'SPOTIFY',
  'MICROSOFT', 'SAMSUNG', 'SONY', 'NINTENDO', 'PLAYSTATION', 'XBOX',
  'IPHONE', 'IPAD', 'MACBOOK', 'ANDROID', 'WINDOWS',
  'ISROTEL', 'HILTON', 'MARRIOTT', 'AIRBNB',
  'MCDONALDS', 'STARBUCKS', 'COCA', 'COLA', 'PEPSI',
  'DISNEY', 'MARVEL', 'PIXAR', 'WARNER', 'HBO', 'CNN', 'BBC',
  'BITCOIN', 'ETHEREUM', 'CRYPTO',
]);

/**
 * Check if a word looks like a proper noun (capitalized brand/name)
 */
function isBrandOrProperNoun(word: string): boolean {
  const upper = word.toUpperCase();
  return BANNED_BRAND_WORDS.has(upper);
}

/**
 * Validate challenges for basic sanity checks
 * NOTE: Dictionary validation removed - Buzz challenges use trending topic words
 * that may not exist in the game dictionary, and that's acceptable for this feature.
 * The AI prompt already instructs to use common dictionary words.
 */
function validateChallenges(
  challenges: BuzzChallenge[],
  _language: string
): BuzzChallenge[] {
  const validatedChallenges = challenges.filter((challenge) => {
    const answer = challenge.answer;

    // Filter out brand names and proper nouns
    if (isBrandOrProperNoun(answer)) {
      console.warn(`[BUZZ] Rejected brand/proper noun: ${answer}`);
      return false;
    }

    // Check word length
    if (answer.length < 3 || answer.length > 15) {
      console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters)`);
      return false;
    }

    // Validate options for multiple choice (check for brands only)
    if (challenge.options) {
      const allValid = challenge.options.every((option) => {
        return !isBrandOrProperNoun(option);
      });
      if (!allValid) {
        console.warn(`[BUZZ] Invalid options contain brand names for: ${challenge.prompt}`);
        return false;
      }
    }

    return true;
  });

  if (validatedChallenges.length < 5) {
    console.error(`[BUZZ] Insufficient validated challenges: ${validatedChallenges.length}`);
    throw new Error('Too many invalid words generated by AI');
  }

  return validatedChallenges;
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
