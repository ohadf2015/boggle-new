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
import { matchesExpectedScript } from '../utils/scriptDetection';
// Dictionary imports removed - Buzz challenges don't validate against game dictionary

interface BuzzChallenge {
  type: 'anagram' | 'fill_blank' | 'word_chain' | 'definition_match' | 'trending_trio' | 'riddle' | 'wordle_guess';
  trend_topic: string;
  prompt: string;
  answer: string;
  hint?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  trending_context: string;
  options?: string[]; // For multiple choice challenges
}

interface SocialPlatformContent {
  text: string;
  hashtags: string[];
}

interface SocialContent {
  x: SocialPlatformContent;
  instagram: SocialPlatformContent;
  tiktok: SocialPlatformContent;
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
  image_alt_text: string | null;
  image_generation_cost_usd: number;
  social_content: SocialContent | null;
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

// Thinking budget for extended reasoning (0 = disabled, max = 32768 for 2.5-pro, 24576 for 2.5-flash)
const THINKING_BUDGET = parseInt(process.env.VERTEX_AI_THINKING_BUDGET || '8192', 10);

// Timeout for AI generation requests (in milliseconds)
// Must be less than API route maxDuration to allow for proper error handling
const AI_GENERATION_TIMEOUT_MS = 90_000; // 90 seconds for full generation
const AI_SINGLE_CHALLENGE_TIMEOUT_MS = 50_000; // 50 seconds for single challenge regeneration

/**
 * Wraps a promise with a timeout
 * Throws a descriptive error if the operation exceeds the specified duration
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(
        `${operationName} timed out after ${timeoutMs / 1000}s. ` +
        `The AI model may be overloaded. Please try again in a few minutes.`
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

interface GenerateDailyBuzzOptions {
  /**
   * INTERNAL USE ONLY. Pre-fetched trends for batch processing.
   * DO NOT expose this parameter through any API endpoint.
   * Allowing external callers to pass custom trends would enable
   * partial overrides and bypass the trend fetching security model.
   */
  cachedTrends?: TrendingTopic[];
  /**
   * If true, deletes the existing challenge and all related attempts
   * before generating a new one. Use for full regeneration when you
   * want a clean slate (not just an overwrite).
   */
  deleteBeforeRegenerate?: boolean;
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

  // Step 0: Delete existing challenge if requested (for clean regeneration)
  if (opts.deleteBeforeRegenerate) {
    console.log(`[BUZZ] Deleting existing challenge before regeneration...`);
    await deleteDailyBuzz(dateStr, language);
  }

  // Step 1: Get trending topics (from passed in, DB cache, or fresh fetch)
  let trends = opts.cachedTrends;

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

  // Step 2: Fetch recently used trends to avoid repetition
  const recentlyUsedTrends = await getRecentlyUsedTrends(language, 7);

  // Step 3: Filter and select appropriate trends (excluding recently used)
  const filteredTrends = filterTrends(trends, language, recentlyUsedTrends);
  if (filteredTrends.length < 3) {
    console.error('[BUZZ] Insufficient trends after filtering');
    // If we filtered out too many, try again without deduplication
    console.log('[BUZZ] Retrying without deduplication filter...');
    const fallbackFiltered = filterTrends(trends, language);
    if (fallbackFiltered.length < 3) {
      throw new Error('Not enough suitable trends for challenges');
    }
    console.log(`[BUZZ] Using fallback filter (${fallbackFiltered.length} trends)`);
  }

  // Step 3: Generate challenges with Claude Opus
  const { challenges, selectedTrends, social_content } = await generateChallengesWithAI(filteredTrends, language, region);

  // Step 4: Validate challenges (basic sanity checks, no dictionary validation)
  const validatedChallenges = validateChallenges(challenges, language);

  // Step 5: Generate hero image (feature flag checked inside)
  // Use one of the selectedTrends that were actually used for challenges
  let imageUrl: string | null = null;
  let imagePrompt: string | null = null;
  let imageCategory: string | null = null;
  let imageAltText: string | null = null;
  let imageCost = 0;

  try {
    // Use the first selected trend (which was actually used in challenges)
    // instead of filteredTrends[0] (which might not be used in any challenge)
    const topTrend = selectedTrends[0];
    imageCategory = categorizeTopic(topTrend.query);

    // Check if feature is enabled (admin-only initially)
    const featureEnabled = await isFeatureFlagEnabled('daily_buzz_images');
    if (featureEnabled) {
      // Check cache first
      const cachedImage = await checkImageCache(topTrend.query);
      if (cachedImage) {
        imageUrl = cachedImage.url;
        // Generate alt text for cached image
        imageAltText = `Trending topic: ${topTrend.query} - Google Trends visualization in ${imageCategory} category`;
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
        imageAltText = imageResult.altText;
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
    image_alt_text: imageAltText,
    image_generation_cost_usd: imageCost,
    social_content: social_content,
  };

  await storeDailyBuzz(buzzData);

  console.log(`[BUZZ] Daily Buzz generated successfully with ${validatedChallenges.length} challenges`);
  return buzzData;
}

/**
 * Filter trending topics for family-friendly, word-game-suitable content
 * PRIORITIZES rising trends (highest increase_percentage) over static popular trends
 * Also filters out trends that don't match the expected language script
 * And filters out recently used trends to ensure freshness
 */
function filterTrends(
  trends: TrendingTopic[],
  language: string,
  recentlyUsedTrends?: Set<string>
): TrendingTopic[] {
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

  const filtered = trends.filter((trend) => {
    const query = trend.query.toLowerCase();
    const normalizedQuery = query.trim();

    // Filter by language script (e.g., reject Arabic trends for Hebrew)
    if (!matchesExpectedScript(trend.query, language)) {
      console.log(`[BUZZ] Filtered trend "${trend.query}" - script mismatch for ${language}`);
      return false;
    }

    // Filter out recently used trends (don't repeat within a week)
    if (recentlyUsedTrends && recentlyUsedTrends.has(normalizedQuery)) {
      console.log(`[BUZZ] Filtered trend "${trend.query}" - recently used (within 7 days)`);
      return false;
    }

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
  });

  // Sort by increase_percentage (rising trends first), then by search_volume as tiebreaker
  // This prioritizes "breaking" trends over static popular topics
  const sorted = filtered.sort((a, b) => {
    const aIncrease = a.increase_percentage ?? 0;
    const bIncrease = b.increase_percentage ?? 0;

    // Primary: highest increase percentage (most rising)
    if (bIncrease !== aIncrease) {
      return bIncrease - aIncrease;
    }

    // Secondary: higher search volume
    return (b.search_volume ?? 0) - (a.search_volume ?? 0);
  });

  console.log(`[BUZZ] Filtered trends sorted by rise velocity: ${sorted.slice(0, 5).map(t =>
    `${t.query} (+${t.increase_percentage ?? 0}%)`
  ).join(', ')}`);

  return sorted.slice(0, 10); // Keep top 10 filtered trends
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
): Promise<{ challenges: BuzzChallenge[]; selectedTrends: TrendingTopic[]; social_content: SocialContent | null }> {
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

  // Select trends for challenges (needed for both prompt and image generation)
  const selectedTrends = selectTrendsForChallenge(trends);

  const prompt = await buildAIPrompt(trends, language, region);

  try {
    // Build generation config with optional thinking for extended reasoning
    // thinkingConfig is supported by Gemini 2.5+ models but not typed in deprecated SDK
    const generationConfig: Record<string, unknown> = {
      temperature: 0.8, // Creative but not too random
      maxOutputTokens: 8000, // Increased to prevent truncation (Hebrew/Japanese responses are longer)
      topP: 0.9,
      topK: 40,
    };

    // Add thinking config for enhanced reasoning if budget > 0
    if (THINKING_BUDGET > 0) {
      generationConfig.thinkingConfig = {
        thinkingBudget: THINKING_BUDGET,
      };
      console.log(`[BUZZ] Using thinking budget: ${THINKING_BUDGET} tokens`);
    }

    const generatePromise = model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    } as Parameters<typeof model.generateContent>[0]);

    // Apply timeout to prevent hanging on slow AI responses
    const result = await withTimeout(
      generatePromise,
      AI_GENERATION_TIMEOUT_MS,
      'AI challenge generation'
    );

    // Parse AI response
    const response = result.response;
    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!responseText) {
      throw new Error('No response text from Gemini');
    }

    const { challenges, social_content } = parseAIResponse(responseText);

    return { challenges, selectedTrends, social_content };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] AI generation failed:', errorMessage);
    // Preserve timeout error messages for better UX
    if (errorMessage.includes('timed out')) {
      throw new Error(errorMessage);
    }
    throw new Error('Failed to generate challenges with AI');
  }
}

/**
 * Get language-specific tone and cultural guidelines for natural-sounding content
 * Each language has its own humor style, cultural references, and communication norms
 */
function getLanguageToneGuide(language: string): string {
  const guides: Record<string, string> = {
    en: `**English (US) - Casual & Clever**:
- Sound like a witty podcast host, not a textbook
- Use pop culture references sparingly (things that age well, not yesterday's meme)
- Contractions are your friend: "you've" not "you have", "it's" not "it is"
- Punchy sentences. Mix short with medium. Like this. Then elaborate when needed.
- Light sarcasm is welcome, but never mean-spirited
- Think late-night talk show banter meets trivia night at your local bar

**Good**: "Where snacks mysteriously vanish during the big game"
**Bad**: "The location where food items are consumed during sporting events"

**Good**: "What your wallet feels like after the holidays"
**Bad**: "The emotional state of one's financial resources post-celebration"`,

    he: `**עברית (ישראל) - ישיר, שנון, עם טוויסט**:
- תכתוב כמו שמדברים ברחוב, לא כמו בכתבה של וואלה
- הישראלים אוהבים צ'וצפה חכמה—תהיה חצוף אבל מתוחכם
- סלנג מודרני הוא פלוס גדול: "יאללה", "סבבה", "אחלה"
- משחקי מילים בעברית הם זהב טהור—נצל את זה
- הומור עצמי זה סימן של ביטחון, לא חולשה
- תחשוב על סטנדאפיסט ישראלי, לא על מגיש חדשות

**טוב**: "מה שנשאר בארנק אחרי חנוכה"
**רע**: "המצב הכלכלי של הפרט בתום תקופת החגים"

**טוב**: "איפה הכדורגלן מתחבא כשהאוכל נגמר"
**רע**: "המיקום בו שחקן הכדורגל ממתין לארוחה"

- REMEMBER: Israelis detect fakeness instantly. Be real, be direct, be a little bit "חוצפן" (cheeky).`,

    sv: `**Svenska - Lagom & Underfundig**:
- "Lagom" är nyckeln—inte för mycket, inte för lite
- Svenskar uppskattar torr humor och understatements
- Undvik överdrifter—"helt okej" kan vara högsta beröm
- Vardagligt språk, men fortfarande välformulerat
- Ordvitsar är populära, särskilt om de är lite "fyndiga"
- Tänk dig en underhållande kompis som inte försöker för hårt

**Bra**: "Vad du letar efter i kylskåpet vid midnatt"
**Dåligt**: "Den matprodukt som människor söker under sena kvällstimmar"

**Bra**: "När bussen kommer... nästa gång"
**Dåligt**: "Tidsperioden tills kollektivtrafikens ankomst"

- Swedish humor is subtle. Let the cleverness speak for itself—don't explain the joke.`,

    ja: `**日本語 - 粋でウィットに富んだ**:
- 言葉遊び（駄洒落・掛詞）は日本語の醍醐味
- 丁寧だけど堅苦しくない—友達と話すような感じ
- ちょっとした「ツッコミ」要素を入れると親しみやすい
- 文化的な共通認識（四季、食べ物、日常あるある）を活用
- 「なるほど！」と思わせる気づきを大切に
- 過剰な敬語や硬い表現は避ける

**良い例**: 「電車で絶対に座れない法則」
**悪い例**: 「公共交通機関における着席の困難性について」

**良い例**: 「お正月に増えるもの、減るもの」
**悪い例**: 「年末年始における体重および金銭の変動」

- Japanese players appreciate subtlety and "ひねり" (twist). The "aha!" moment should feel earned.`,

    es: `**Español - Expresivo & Juguetón**:
- El español es un idioma cálido y expresivo—¡aprovéchalo!
- Los dobles sentidos y juegos de palabras son bienvenidos
- Puedes ser un poco dramático (en el buen sentido)
- Usa expresiones coloquiales que todos entienden: "mola", "flipar", "currar"
- El humor debe sentirse como una charla con amigos, no un examen
- Evita el lenguaje corporativo a toda costa

**Bien**: "Lo que desaparece del refrigerador cuando nadie mira"
**Mal**: "El fenómeno de la desaparición de alimentos del electrodoméstico"

**Bien**: "Donde tu dinero se va de vacaciones permanentes"
**Mal**: "El destino final de los recursos económicos personales"

- Spanish-speaking players love when you're clever but never condescending. Be "majo" (likeable), not "pesado" (tiresome).`,
  };

  return guides[language] || guides.en;
}

// Categories to deprioritize (sports is often over-represented in trends)
const LOW_PRIORITY_CATEGORIES = ['Sports', 'Soccer', 'Football', 'Basketball', 'Tennis', 'Baseball'];

// Sports keywords for detecting sport riddles (used in validation)
const SPORTS_KEYWORDS = [
  'sport', 'soccer', 'football', 'basketball', 'tennis', 'baseball', 'hockey',
  'golf', 'cricket', 'rugby', 'volleyball', 'boxing', 'wrestling', 'marathon',
  'olympics', 'athlete', 'championship', 'league', 'nba', 'nfl', 'mlb', 'fifa',
  'game', 'match', 'score', 'team', 'player', 'coach', 'stadium', 'ball',
];

/**
 * Check if a challenge is sports-related based on its topic
 */
function isSportsRelatedChallenge(challenge: BuzzChallenge): boolean {
  const topic = challenge.trend_topic?.toLowerCase() ?? '';
  const prompt = challenge.prompt?.toLowerCase() ?? '';
  const context = challenge.trending_context?.toLowerCase() ?? '';

  return SPORTS_KEYWORDS.some(keyword =>
    topic.includes(keyword) || prompt.includes(keyword) || context.includes(keyword)
  );
}

/**
 * Check if a trend belongs to a low-priority category (e.g., sports)
 */
function isLowPriorityCategory(trend: TrendingTopic): boolean {
  const categoryNames = trend.categories?.map(c => c.name) ?? [];
  return categoryNames.some(name =>
    LOW_PRIORITY_CATEGORIES.some(lowPri =>
      name.toLowerCase().includes(lowPri.toLowerCase())
    )
  );
}

/**
 * Select trends for challenge generation
 * Prioritizes rising trends while maintaining diversity across categories
 * Deprioritizes sports and ensures no single category dominates
 */
function selectTrendsForChallenge(trends: TrendingTopic[]): TrendingTopic[] {
  if (trends.length <= 5) return trends;

  const selected: TrendingTopic[] = [];
  const categoryCount = new Map<string, number>();
  const MAX_PER_CATEGORY = 2; // No category should have more than 2 trends
  const MAX_SPORTS = 1; // Only 1 sports trend allowed

  /**
   * Check if we can add a trend based on category limits
   */
  function canAddTrend(trend: TrendingTopic): boolean {
    const category = trend.categories?.[0]?.name ?? 'General';
    const currentCount = categoryCount.get(category) ?? 0;

    // Check sports limit
    if (isLowPriorityCategory(trend)) {
      const sportsCount = Array.from(categoryCount.entries())
        .filter(([cat]) => LOW_PRIORITY_CATEGORIES.some(lp =>
          cat.toLowerCase().includes(lp.toLowerCase())
        ))
        .reduce((sum, [, count]) => sum + count, 0);
      if (sportsCount >= MAX_SPORTS) return false;
    }

    // Check general category limit
    return currentCount < MAX_PER_CATEGORY;
  }

  /**
   * Add a trend and update category counts
   */
  function addTrend(trend: TrendingTopic): void {
    const category = trend.categories?.[0]?.name ?? 'General';
    selected.push(trend);
    categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
  }

  // Separate sports and non-sports trends
  const nonSportsTrends = trends.filter(t => !isLowPriorityCategory(t));
  const sportsTrends = trends.filter(t => isLowPriorityCategory(t));

  // First pass: prioritize fastest-rising NON-SPORTS trends (increase_percentage > 100%)
  const risingFastNonSports = nonSportsTrends.filter(t => (t.increase_percentage ?? 0) > 100);
  for (const trend of risingFastNonSports) {
    if (selected.length >= 5) break;
    if (canAddTrend(trend)) {
      addTrend(trend);
    }
  }

  // Second pass: fill with rising non-sports trends
  const risingNonSports = nonSportsTrends.filter(t =>
    (t.increase_percentage ?? 0) > 0 && !selected.includes(t)
  );
  for (const trend of risingNonSports) {
    if (selected.length >= 5) break;
    if (canAddTrend(trend)) {
      addTrend(trend);
    }
  }

  // Third pass: add up to 1 sports trend if we have room and good rising sports
  const risingSports = sportsTrends.filter(t => (t.increase_percentage ?? 0) > 50);
  for (const trend of risingSports) {
    if (selected.length >= 5) break;
    if (canAddTrend(trend)) {
      addTrend(trend);
      break; // Only add 1 sports trend
    }
  }

  // Fourth pass: fill remaining slots with any non-sports trends
  for (const trend of nonSportsTrends) {
    if (selected.length >= 5) break;
    if (!selected.includes(trend) && canAddTrend(trend)) {
      addTrend(trend);
    }
  }

  // Final pass: fill with remaining trends while still respecting category limits (including sports limit)
  for (const trend of trends) {
    if (selected.length >= 5) break;
    if (!selected.includes(trend) && canAddTrend(trend)) {
      addTrend(trend);
    }
  }

  // Ultra-fallback: if still not enough trends, add ANY remaining (should rarely happen)
  // This prevents empty challenge sets when all trends are from limited categories
  if (selected.length < 5) {
    for (const trend of trends) {
      if (selected.length >= 5) break;
      if (!selected.includes(trend)) {
        addTrend(trend);
      }
    }
  }

  console.log(`[BUZZ] Selected trends by category: ${Array.from(categoryCount.entries()).map(([cat, count]) => `${cat}:${count}`).join(', ')}`);

  return selected;
}

/**
 * Get stop words for filtering by language
 * These are common words that shouldn't be used as answer candidates
 */
function getStopWords(language: string): Set<string> {
  const stopWordsByLang: Record<string, string[]> = {
    en: ['the', 'and', 'for', 'that', 'with', 'from', 'this', 'are', 'was', 'been', 'has', 'have', 'about', 'what', 'when', 'where', 'news', 'update', 'latest', 'breaking', 'new', 'first', 'last', 'just', 'now', 'today', 'here', 'there', 'says', 'said', 'after', 'before', 'will', 'how', 'why', 'who', 'more', 'most', 'some', 'other'],
    he: ['של', 'על', 'את', 'עם', 'זה', 'היא', 'הוא', 'אני', 'לא', 'כי', 'גם', 'אם', 'או', 'יש', 'היום', 'חדשות', 'אחרי', 'לפני', 'עכשיו', 'כאן', 'שם', 'אומר', 'אמר', 'יותר', 'הכי', 'כמה', 'אחר', 'עוד'],
    sv: ['och', 'det', 'att', 'för', 'med', 'som', 'den', 'har', 'var', 'inte', 'efter', 'före', 'här', 'där', 'säger', 'mer', 'mest', 'annan'],
    ja: ['の', 'は', 'が', 'を', 'に', 'で', 'と', 'も', 'か', 'です', 'ます', 'した', 'する', 'ある', 'いる', 'これ', 'それ', 'あれ'],
    es: ['que', 'para', 'con', 'del', 'las', 'los', 'una', 'por', 'más', 'como', 'pero', 'este', 'esta', 'sobre', 'todo', 'también', 'desde', 'entre', 'hasta', 'según', 'dice', 'nuevo', 'nueva'],
  };

  return new Set(stopWordsByLang[language] || stopWordsByLang.en);
}

/**
 * Extract common keywords from trend breakdowns
 * Parses phrases and extracts meaningful single words that could be answer candidates
 */
function extractKeywordsFromBreakdowns(trends: TrendingTopic[], language: string): string[] {
  const stopWords = getStopWords(language);
  const keywords = new Map<string, number>(); // word -> frequency

  for (const trend of trends) {
    if (!trend.trend_breakdown) continue;

    for (const phrase of trend.trend_breakdown) {
      // Split phrase into words
      const words = phrase
        .toLowerCase()
        .split(/[\s,.\-:;!?"'()]+/)
        .filter(word =>
          word.length >= 3 &&
          word.length <= 12 &&
          !stopWords.has(word) &&
          !/^\d+$/.test(word) &&
          !/^[^a-zA-Zא-ת\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(word) // Has actual letters
        );

      words.forEach(word => {
        keywords.set(word, (keywords.get(word) ?? 0) + 1);
      });
    }
  }

  // Sort by frequency and return top 20 most common keywords
  return Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Build prompt for Gemini to generate word challenges
 * Uses sophisticated lateral thinking approach for unpredictable connections
 * Includes improvement examples from admin feedback to guide AI
 */
async function buildAIPrompt(
  trends: TrendingTopic[],
  language: string,
  region: string
): Promise<string> {
  // Select trends freely - prioritize rising trends (already sorted by increase_percentage)
  // Take variety: mix of fastest-rising and high-volume for diversity
  const selectedTrends = selectTrendsForChallenge(trends);

  // Extract keywords from ALL trend breakdowns for answer suggestions
  const extractedKeywords = extractKeywordsFromBreakdowns(selectedTrends, language);

  const trendsContext = selectedTrends
    .map((trend, idx) => {
      // Use ALL breakdown items, not just first 3
      const breakdownItems = trend.trend_breakdown ?? [];
      const contextParts = breakdownItems.length > 0
        ? breakdownItems.join(', ')
        : trend.categories?.map(c => c.name).join(', ') || 'Currently trending';
      const volumeDisplay = trend.search_volume
        ? `${(trend.search_volume / 1000).toFixed(0)}K+`
        : 'prominent';
      const riseIndicator = trend.increase_percentage
        ? ` 🔥 RISING +${trend.increase_percentage}%`
        : '';
      return `${idx + 1}. "${trend.query}" - ${volumeDisplay} searches${riseIndicator}\n   Breakdown context: ${contextParts}`;
    })
    .join('\n\n');

  // Build keywords section for AI prompt
  const keywordsSection = extractedKeywords.length > 0
    ? `
---

## PRIORITY ANSWER WORDS (from trend breakdowns - USE THESE!)

These words are extracted from today's trending topic breakdowns. **STRONGLY PREFER** using these as answers because they create timely, relevant challenges:

${extractedKeywords.map(kw => `- **${kw.toUpperCase()}** (trending today)`).join('\n')}

**REQUIREMENT**: At least 3 of your 5 challenges MUST use a word from this list as the answer. This ensures challenges feel fresh and connected to what's happening RIGHT NOW.

**Exception**: Only deviate if none of these words can create a good guessable challenge with the available prompt types.
`
    : '';

  // Language-specific examples and rules
  const langExamples = language === 'he' ? `
**Hebrew Word Examples by Trend**:
- Trend about Iran/conflict → מלחמה (war), שלום (peace), הגנה (defense), טיל (missile), התקפה (attack), צבא (army)
- Trend about weather → גשם (rain), שלג (snow), קור (cold), סערה (storm), רוח (wind)
- Trend about sports → כדורגל (soccer), נצחון (victory), גביע (trophy), גול (goal - NOT שער!)
- Trend about politics → בחירות (elections), ממשלה (government), חוק (law), מדינה (state)
- Trend about economy → כסף (money), בנק (bank), מחיר (price), שוק (market)

**HEBREW WORD POPULARITY - USE MODERN COLLOQUIAL TERMS**:
In Hebrew, ALWAYS prefer the word Israelis actually USE in daily speech over formal/literary alternatives:
- גול (goal) NOT שער (gate) for soccer scoring
- סלפי (selfie) NOT צילום עצמי (self-photo)
- אינטרנט (internet) NOT מרשתת (network)
- קליק (click) NOT הקלקה (formal click)
- לייק (like) NOT אהבתי (I liked)
- פוסט (post) NOT פרסום (publication)
- אפליקציה or אפ (app) NOT יישומון (application)
- Think: "What would an Israeli teenager type?" - that's usually the right answer

**CRITICAL HEBREW LANGUAGE RULES**:
1. ALL text in prompts and answers MUST use ONLY Hebrew characters (א-ת)
2. NEVER include English letters, Arabic letters (ا-ي), or any non-Hebrew script
3. NEVER mix scripts - if the answer is Hebrew, ALL text must be Hebrew
4. Numbers can be Hebrew numerals or spelled out in Hebrew words
5. Verify EVERY character is valid Hebrew before outputting

**HEBREW SCRAMBLED LETTER RULES (CRITICAL)**:
When creating anagram/scrambled challenges, you MUST convert final letters (sofiot) to their regular forms:
- ך (final kaf) → כ (regular kaf)
- ם (final mem) → מ (regular mem)
- ן (final nun) → נ (regular nun)
- ף (final pe) → פ (regular pe)
- ץ (final tsadi) → צ (regular tsadi)

This prevents giving away that a letter is at the end of the word!

Example:
- Word שלום (shalom) with final ם
- WRONG scrambled: "מולש" (using ם reveals it's the ending)
- CORRECT scrambled: "מולש" should be "מולש" with מ not ם
- The scrambled letters should be: ש,ל,ו,מ (using מ instead of ם)` : `
**Word Examples by Trend**:
- Trend about conflict/war → WAR, PEACE, DEFENSE, MISSILE, ATTACK, ARMY, BATTLE, TREATY
- Trend about weather → RAIN, SNOW, COLD, STORM, WIND, HEAT, FLOOD, FREEZE
- Trend about sports → SOCCER, VICTORY, TROPHY, GOAL, MATCH, SCORE, CHAMPION
- Trend about politics → ELECTION, VOTE, LAW, STATE, LEADER, DEBATE, POLICY
- Trend about economy → MONEY, BANK, PRICE, MARKET, TRADE, STOCK, PROFIT

**WORD POPULARITY - CHOOSE THE OBVIOUS WORD**:
Always pick the word that 90% of native speakers would guess FIRST:
- For "what you win" → PRIZE (not AWARD, TROPHY, or MEDAL - unless context is specific)
- For "scoring in soccer" → GOAL (not SCORE or POINT)
- For "the end of life" → DEATH (not DEMISE, PASSING, or EXPIRY)
- For "very happy" → HAPPY or JOY (not ELATED, EUPHORIC, or BLISSFUL)
- For "a place to sleep" → BED (not COT, BUNK, or MATTRESS)
- Test yourself: "What would most people type first?" - that's your answer
- Avoid synonyms that are less common even if technically correct`;

  // Language-specific persona and tone guidance
  const languageToneGuide = getLanguageToneGuide(language);

  const basePrompt = `You are a witty puzzle-crafter for LexiClash, a neo-brutalist word game that doesn't take itself too seriously. Think of yourself as that clever friend who always has the perfect pun at parties—the one who makes people groan AND laugh at the same time.

Your mission? Create word challenges that make players go "Ohhh, NICE!" when they get it. We're going for that sweet spot between clever and accessible—the kind of wordplay you'd share in a group chat, not present at an academic conference.

**Target Language**: ${language}
**Region**: ${region}
**Date**: ${new Date().toISOString().split('T')[0]}

---

## 🎭 TONE & VOICE: SOUND LIKE A HUMAN, NOT A ROBOT

${languageToneGuide}

**Universal Anti-Robotic Rules**:
- NO corporate buzzwords ("leverage", "synergy", "optimize your experience")
- NO AI-slop phrases ("Certainly!", "I'd be happy to help", "Here's a fun fact")
- NO over-explaining—trust the player to get it
- NO hollow excitement ("Amazing!", "Incredible!", "Wow!")—earn emotional reactions through cleverness
- YES to wordplay, puns, and double meanings
- YES to cultural references that MOST people would recognize
- YES to a light touch of cheekiness
- YES to conversational rhythm—read your prompts aloud, they should flow naturally

**The "Coffee Shop Test"**: Would you say this out loud to a friend without cringing? If not, rewrite it.

---

**TODAY'S TRENDING TOPICS** (prioritized by rise velocity - 🔥 = fastest rising):
${trendsContext}
${keywordsSection}
---

## 🎯 THE CREATIVE PHILOSOPHY: SURPRISING CONNECTIONS

**AVOID the obvious.** Players expect predictable word-trend pairings. Your job is to CREATE UNEXPECTED DELIGHT.

**THE PREDICTABILITY PROBLEM** (what NOT to do):
- Trend: "Super Bowl" → Answer: FOOTBALL ❌ Too obvious
- Trend: "Climate Summit" → Answer: WARMING ❌ First thing anyone thinks
- Trend: "Stock Market Crash" → Answer: MONEY ❌ Boring, expected

**THE LATERAL THINKING SOLUTION** (what TO do):
- Trend: "Super Bowl" → Answer: SNACK (everyone eats chips watching) ✅
- Trend: "Super Bowl" → Answer: COUCH (where fans gather) ✅
- Trend: "Super Bowl" → Answer: WINGS (the real star of the party) ✅
- Trend: "Climate Summit" → Answer: DELEGATE (who actually attends) ✅
- Trend: "Stock Market" → Answer: SWEAT (what traders experience) ✅

**CONNECTION TECHNIQUES**:
1. **Adjacent Domain**: Move to a related but unexpected domain
   - Sports event → FOOD (what people eat), COUCH (where they sit), JERSEY (what fans wear)
   - Tech launch → QUEUE (people waiting), HYPE (the atmosphere), CRASH (what servers do)
   - Political event → SUIT (what politicians wear), SPIN (how news is framed)

2. **Cause/Effect Chain**: Think 2-3 steps removed
   - War → REFUGEE (consequence) → CAMP (where they go) → TENT (what they live in)
   - Rain → FLOOD (result) → RESCUE (response) → BOAT (the tool)

3. **Sensory/Emotional**: What do people FEEL or EXPERIENCE?
   - Earthquake → SHAKE (physical), FEAR (emotion), DUST (what rises)
   - Victory → ROAR (crowd sound), TEARS (reaction), EMBRACE (celebration)

4. **Everyday Objects**: The mundane items involved
   - Election → BOOTH, BALLOT, PEN, LINE, STICKER
   - Wedding (celebrity) → CAKE, DRESS, RING, TOAST, VEIL

5. **Metaphorical Leap**: Abstract the concept
   - AI technology → BRAIN (metaphor), DREAM (what it represents), GHOST (unseen helper)
   - Scandal → SHADOW (hidden things), MASK (false appearances), SMOKE (where there's fire)

---

## 📋 CHALLENGE REQUIREMENTS

**Your Task**: Create 5-7 word mini-challenges using the rising trends above. PRIORITIZE the 🔥 rising trends - they're what's exploding RIGHT NOW.

**Word Selection Rules**:
1. NEVER use brand names, celebrity names, or country names AS ANSWERS
2. Answers must be COMMON DICTIONARY WORDS that 90% of people know
3. Words should be 3-12 letters (EXACTLY 5 letters for wordle_guess)
4. The answer must be GUESSABLE - when players see the clue + trend context, the word should "click"
5. You CAN reference proper nouns in CLUES, just not as answers
${langExamples}

**WORD POPULARITY still matters**:
- Choose words people use DAILY, not obscure synonyms
- Test: "Would a 12-year-old know this word?" → If yes, good choice
- Avoid jargon, technical terms, or literary vocabulary

---

## 🎮 CHALLENGE TYPES (with lateral thinking examples)

1. **anagram**: Trend-connected clue + scrambled letters
   - Format: "[Unexpected angle on trend] | Letters: XXXXX"
   - Trend "Olympics" → "Where fans crush together | Letters: DOWCR" → CROWD
   - Trend "AI Summit" → "What nervous speakers do | Letters: TSAEW" → SWEAT

2. **fill_blank**: Phrase with unexpected angle on trend
   - Format: "Phrase with _ _ _ _ _ (N letters)" - USE SPACED UNDERSCORES matching exact word length!
   - CRITICAL: Count of underscores MUST EQUAL the answer length. Each underscore = one letter.
   - Trend "Election" → "Voters stood in _ _ _ _ for hours (4 letters)" → LINE (4 letters = 4 underscores)
   - Trend "Heat Wave" → "People escaped to the _ _ _ _ _ (5 letters)" → SHADE (5 letters = 5 underscores)
   - WRONG: "Fill in the _____ (6 letters)" → generic underscores don't match!
   - RIGHT: "Fill in the _ _ _ _ _ _ (6 letters)" → 6 spaced underscores = 6 letters

3. **word_chain**: COMPOUND WORD CHAIN - Answer forms compound words with BOTH neighbors
   - Format: "WORD1 → ??? → WORD2" - Player must guess the middle word
   - CRITICAL: The answer MUST create valid compound words on BOTH sides:
     * WORD1 + ANSWER = compound word
     * ANSWER + WORD2 = compound word

   **VERIFIED COMPOUND CHAINS (use these patterns)**:
   - SUN → ??? → POT → FLOWER (sunFLOWER + FLOWERpot) ✅
   - FIRE → ??? → SHOP → WORK (fireWORK + WORKshop) ✅
   - BOOK → ??? → DOWN → MARK (bookMARK + MARKdown) ✅
   - HAND → ??? → UP → MADE (handMADE + MADEup... wait, "madeup" isn't a compound)

   **ACTUALLY VALID CHAINS**:
   - SUN → FLOWER → POT (SUNflower + FLOWERpot) ✅
   - FIRE → WORK → SHOP (FIREwork + WORKshop) ✅
   - BACK → PACK → AGE (BACKpack + PACKage) ✅
   - DOOR → STEP → CHILD (DOORstep + STEPchild) ✅
   - TOOTH → PICK → UP (TOOTHpick + PICKup) ✅
   - DATA → BASE → LINE (DATAbase + BASEline) ✅
   - GRAND → STAND → STILL (GRANDstand + STANDstill) ✅

   **BEFORE SUBMITTING**: Verify BOTH compound words exist:
   1. Does WORD1 + ANSWER = real word?
   2. Does ANSWER + WORD2 = real word?

   - Trend "Technology" → "DATA → ??? → LINE" → BASE (database + baseline) ✅

4. **definition_match**: Word from unexpected angle, 4 options
   - Trend "Wildfire" → Word for "people who leave their homes": EVACUEE, REFUGEE, MIGRANT, NOMAD

5. **riddle**: THE PREMIUM CHALLENGE - Deeply metaphorical, 2-3 steps removed from literal

   **Riddle Philosophy**: The best riddles work on MULTIPLE LEVELS simultaneously. They describe the answer literally while also connecting metaphorically to the trend.

   **WEAK riddle** (too literal):
   - Trend "Peace Talks" → "I am the opposite of war" → PEACE ❌

   **STRONG riddle** (layered metaphor):
   - Trend "Peace Talks" → "I am weightless yet heavy on hearts. Countries bargain for me like gold, yet I cannot be bought. I am signed but never written. What am I?" → TREATY ✅

   **Advanced Riddle Techniques**:
   - **Paradox**: "I grow shorter as I grow older" (CANDLE)
   - **Inversion**: "I have cities without houses, forests without trees" (MAP)
   - **Personification**: "I have teeth but cannot bite" (COMB, ZIPPER)
   - **Sensory confusion**: "I can be cracked, told, and made, but never touched" (JOKE)
   - **Time paradox**: "The more you take, the more you leave behind" (STEPS)

   **Sophisticated Trend-Connected Riddles**:
   - Trend "Stock Market": "I rise and fall without legs, panic follows my descent, yet I am only made of belief. What am I?" → VALUE
   - Trend "Solar Eclipse": "I arrive by blocking the light, yet millions travel to witness my shadow. I am born from alignment. What am I?" → ECLIPSE
   - Trend "Viral Video": "I spread without legs, infect without germs, and can make strangers famous overnight. What am I?" → MEME
   - Trend "AI Chatbot": "I have answers but no brain, remember nothing yet recall everything, exist everywhere yet nowhere. What am I?" → CLOUD

6. **wordle_guess**: 5-letter word with unexpected connection
   - Format: "[Clue from unusual angle]"
   - Trend "Marathon" → "What winners break at the end (5 letters)" → SWEAT (not TAPE)
   - Trend "Concert" → "What you lose after the show (5 letters)" → VOICE

---

## 📤 OUTPUT FORMAT (JSON only, no markdown)

{
  "date": "${new Date().toISOString().split('T')[0]}",
  "language": "${language}",
  "trending_summary": "[Catchy, witty 2-5 word theme that sounds fun - NOT 'Today:' prefix] (max 50 chars)",
  "challenges": [
    {
      "type": "anagram|fill_blank|word_chain|definition_match|riddle|wordle_guess",
      "trend_topic": "[Actual trending topic used]",
      "prompt": "[The creative, witty clue - conversational, not robotic]",
      "answer": "[COMMON DICTIONARY WORD - all caps]",
      "hint": "[Brief, friendly hint - like a friend giving you a nudge]",
      "difficulty": "easy|medium|hard",
      "trending_context": "[1 punchy sentence: why this matters TODAY - be human about it]"
    }
  ],
  "social_content": {
    "x": {
      "text": "[Max 280 chars - punchy hook + trending topic reference + CTA]",
      "hashtags": ["LexiClash", "WordGame", "DailyChallenge"]
    },
    "instagram": {
      "text": "[Engaging caption 150-300 chars with trending topic hook + CTA to play]",
      "hashtags": ["LexiClash", "WordGame", "DailyChallenge", "BrainGames", "WordPuzzle", "TrendingNow"]
    },
    "tiktok": {
      "text": "[Short hook max 150 chars - trending reference + urgency]",
      "hashtags": ["LexiClash", "WordGame", "DailyChallenge", "BrainTok"]
    }
  }
}

**trending_summary Examples by Language**:
- English: "Politics & Popcorn 🍿" / "Tech Drama, Again" / "Sports Gone Wild"
- Hebrew: "בלאגן יומי" / "חדשות חמות 🔥" / "הכל הפוך"
- Swedish: "Lagom Kaos" / "Veckans Snackis" / "Typiskt Tisdag"
- Japanese: "今日もカオス" / "バズってる話題" / "トレンド祭り"
- Spanish: "Día de Locos" / "Tendencias Picantes 🌶️" / "El Mundo Anda Loco"

---

## 📱 SOCIAL MEDIA POSTS

Generate ready-to-post content for each platform in **${language}**. Each post should:
- Hook readers with today's trending topic (the TOP trend from the list)
- Tease the word challenges without spoilers
- Include a call-to-action to play
- Use platform-appropriate tone and format
- Be written in the TARGET LANGUAGE (${language === 'he' ? 'Hebrew' : language === 'sv' ? 'Swedish' : language === 'ja' ? 'Japanese' : language === 'es' ? 'Spanish' : 'English'})

### X (Twitter) - Max 280 characters TOTAL (including hashtags)
- Punchy hook referencing the top trending topic
- Tease the challenge without spoiling answers
- "Play now" or "Try today's challenge" CTA
- 2-3 relevant hashtags (mixed trending + game-related)
- Example (EN): "Everyone's talking about [TREND] 🔥 Can you crack today's word challenges? 💪 Play now: lexiclash.com #LexiClash #[TrendHashtag]"

### Instagram - Caption (150-300 chars) + hashtags
- Engaging opening line with trending topic hook
- Brief tease about today's challenges
- CTA to play (link in bio mention)
- 8-12 relevant hashtags (mix of trending, word game, brain game tags)
- Example (EN): "Today's trending: [TREND] 💬 We turned it into word puzzles! Can you solve them all? 🧩 Link in bio 👆"

### TikTok - Short caption (max 150 chars) + hashtags
- Ultra-short, attention-grabbing hook
- Trending topic reference
- Urgency or exclusivity angle ("only 1 chance daily!")
- 4-6 trending/relevant hashtags
- Example (EN): "[TREND] is blowing up 🔥 Test your word skills NOW 👉 #LexiClash"

**Language-specific social tone**:
${language === 'he' ? '- Hebrew: Direct, use slang (יאללה, אחלה), be a bit חוצפן' : ''}
${language === 'sv' ? '- Swedish: Lagom enthusiasm, understated humor, no overselling' : ''}
${language === 'ja' ? '- Japanese: Use trendy expressions, emoji-friendly, playful but polite' : ''}
${language === 'es' ? '- Spanish: Warm and expressive, use colloquial phrases, light humor' : ''}
${language === 'en' ? '- English: Casual, witty, pop culture aware, conversational' : ''}

---

## ⚠️ FINAL CHECKLIST

Before outputting, verify each challenge:
- [ ] **Surprise Test**: Is the connection SURPRISING but SATISFYING?
- [ ] **Common Word Test**: Would your grandma know this word?
- [ ] **Aha Test**: Does the clue make players go "Ohhh, nice!"?
- [ ] **Riddle Depth**: Do riddles work on multiple levels (literal + metaphorical)?
- [ ] **Freshness Test**: Have I prioritized the 🔥 RISING trends?
- [ ] **Riddle Count**: Are there at least 2 sophisticated riddles in the set?
- [ ] **Share Test**: Would someone screenshot this to send to a friend?
- [ ] **Cringe Test**: Read each prompt aloud—does it sound natural or robotic?
- [ ] **Native Speaker Test**: Would a ${language === 'he' ? 'Israeli' : language === 'sv' ? 'Swede' : language === 'ja' ? 'Japanese person' : language === 'es' ? 'Spanish speaker' : 'native speaker'} say this?
- [ ] **Social Content Test**: Are all social posts in ${language}? Do they reference the top trend? Are character limits respected?

Return ONLY the JSON object. Make every challenge feel fresh, clever, and connected to TODAY—like it was written by a witty friend, not a corporate chatbot.`;

  // Fetch and append improvement examples from admin feedback
  const examples = await getPromptExamples(language, 20);

  if (examples.length > 0) {
    const examplesSection = buildImprovementExamplesSection(examples);
    return basePrompt + examplesSection;
  }

  return basePrompt;
}

/**
 * Build the improvement examples section for the AI prompt
 * Shows rejected challenges with feedback to help AI avoid similar mistakes
 */
function buildImprovementExamplesSection(examples: PromptExample[]): string {
  const formattedExamples = examples.slice(0, 15).map((ex, i) => {
    let example = `
**Example ${i + 1}** (${ex.challenge_type}):
- REJECTED: "${ex.original_prompt}" → "${ex.original_answer}"
- ISSUE: ${ex.feedback}`;

    if (ex.improved_prompt && ex.improved_answer) {
      example += `
- BETTER: "${ex.improved_prompt}" → "${ex.improved_answer}"`;
    }

    return example;
  }).join('\n');

  return `

---

## 🚫 IMPROVEMENT EXAMPLES (Learn from past mistakes)

These challenges were rejected by admins. Study the feedback and AVOID similar issues:

${formattedExamples}

**Key Takeaways**: Review the patterns above. Common issues include:
- Words that are too obscure or literary (use everyday vocabulary)
- Clues that give away the answer too easily
- Cultural references that don't translate well
- Answers that are too predictable or too obscure
- Prompts that sound robotic instead of conversational
`;
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
 * Normalize fill_blank challenges to have correct underscore count
 * Replaces generic blanks with properly sized spaced underscores
 */
function normalizeBlankSizes(challenges: BuzzChallenge[]): BuzzChallenge[] {
  return challenges.map(challenge => {
    if (challenge.type !== 'fill_blank') return challenge;

    const answerLength = challenge.answer.replace(/\s/g, '').length; // Handle answers without spaces
    const spacedBlanks = Array(answerLength).fill('_').join(' ');

    // Replace various blank patterns with correct size
    let normalizedPrompt = challenge.prompt
      // Replace continuous underscores (_____, ____, etc.)
      .replace(/_{3,}/g, spacedBlanks)
      // Replace asterisks used as blanks
      .replace(/\*{3,}/g, spacedBlanks)
      // Replace dots used as blanks
      .replace(/\.{3,}/g, spacedBlanks)
      // Replace already-spaced underscores that might be wrong count
      .replace(/(\s*_\s*)+/g, (match) => {
        // Only replace if there are underscores
        const existingCount = (match.match(/_/g) || []).length;
        // If the existing count matches, keep it; otherwise replace
        if (existingCount !== answerLength) {
          return ` ${spacedBlanks} `;
        }
        return match;
      });

    // Update or add letter count notation
    const letterCountPattern = /\((\d+)\s*letters?\)/i;
    if (letterCountPattern.test(normalizedPrompt)) {
      normalizedPrompt = normalizedPrompt.replace(
        letterCountPattern,
        `(${answerLength} letters)`
      );
    } else {
      // Add letter count if not present
      normalizedPrompt = `${normalizedPrompt.trim()} (${answerLength} letters)`;
    }

    return {
      ...challenge,
      prompt: normalizedPrompt.replace(/\s+/g, ' ').trim() // Clean up extra spaces
    };
  });
}

interface ParsedAIResponse {
  challenges: BuzzChallenge[];
  social_content: SocialContent | null;
}

/**
 * Parse AI response into structured challenges and social content
 */
function parseAIResponse(responseText: string): ParsedAIResponse {
  // Remove markdown code blocks if present
  let jsonText = responseText.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
  }

  // First attempt: direct parse
  let parsed: { challenges?: BuzzChallenge[]; social_content?: SocialContent };
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

  // Normalize fill_blank challenges to have correct blank sizes
  const normalizedChallenges = normalizeBlankSizes(validChallenges);

  // Extract and validate social content (optional - don't fail if missing)
  let socialContent: SocialContent | null = null;
  if (parsed.social_content) {
    const sc = parsed.social_content;
    // Validate structure - must have all three platforms with text and hashtags
    if (
      sc.x?.text && Array.isArray(sc.x?.hashtags) &&
      sc.instagram?.text && Array.isArray(sc.instagram?.hashtags) &&
      sc.tiktok?.text && Array.isArray(sc.tiktok?.hashtags)
    ) {
      socialContent = {
        x: { text: sc.x.text, hashtags: sc.x.hashtags },
        instagram: { text: sc.instagram.text, hashtags: sc.instagram.hashtags },
        tiktok: { text: sc.tiktok.text, hashtags: sc.tiktok.hashtags },
      };
      console.log('[BUZZ] Social content parsed successfully');
    } else {
      console.warn('[BUZZ] Social content structure invalid, skipping');
    }
  } else {
    console.warn('[BUZZ] No social content in AI response');
  }

  return {
    challenges: normalizedChallenges,
    social_content: socialContent,
  };
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

// Wordle challenge requires exactly 5-letter words (matches WORD_LENGTH in WordleChallenge.tsx)
const WORDLE_WORD_LENGTH = 5;

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

    // Special validation for wordle_guess: must be exactly 5 letters
    if (challenge.type === 'wordle_guess') {
      if (answer.length !== WORDLE_WORD_LENGTH) {
        console.warn(`[BUZZ] Wordle answer must be exactly ${WORDLE_WORD_LENGTH} letters: "${answer}" (${answer.length} letters)`);
        return false;
      }
    } else {
      // Check word length for non-wordle challenges (3-15 letters)
      if (answer.length < 3 || answer.length > 15) {
        console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters)`);
        return false;
      }
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

  // Enforce max 1 sport riddle constraint
  const sportsRiddles = validatedChallenges.filter(
    c => c.type === 'riddle' && isSportsRelatedChallenge(c)
  );
  if (sportsRiddles.length > 1) {
    console.warn(`[BUZZ] Too many sports riddles (${sportsRiddles.length}), keeping only the first one`);
    // Keep only the first sports riddle, remove the rest
    let foundFirst = false;
    return validatedChallenges.filter(c => {
      if (c.type === 'riddle' && isSportsRelatedChallenge(c)) {
        if (foundFirst) return false;
        foundFirst = true;
      }
      return true;
    });
  }

  return validatedChallenges;
}

/**
 * Validate a single challenge without minimum count requirement
 * Used for regenerating individual challenges
 */
function validateSingleChallenge(
  challenge: BuzzChallenge,
  _language: string
): boolean {
  const answer = challenge.answer;

  // Filter out brand names and proper nouns
  if (isBrandOrProperNoun(answer)) {
    console.warn(`[BUZZ] Rejected brand/proper noun: ${answer}`);
    return false;
  }

  // Special validation for wordle_guess: must be exactly 5 letters
  if (challenge.type === 'wordle_guess') {
    if (answer.length !== WORDLE_WORD_LENGTH) {
      console.warn(`[BUZZ] Wordle answer must be exactly ${WORDLE_WORD_LENGTH} letters: "${answer}" (${answer.length} letters)`);
      return false;
    }
  } else {
    // Check word length for non-wordle challenges (3-15 letters)
    if (answer.length < 3 || answer.length > 15) {
      console.warn(`[BUZZ] Word length invalid: ${answer} (${answer.length} letters)`);
      return false;
    }
  }

  // Validate options for multiple choice (check for brands only)
  if (challenge.options) {
    const allValid = challenge.options.every((option) => !isBrandOrProperNoun(option));
    if (!allValid) {
      console.warn(`[BUZZ] Invalid options contain brand names for: ${challenge.prompt}`);
      return false;
    }
  }

  return true;
}

/**
 * Generate trending summary from topics
 */
function generateTrendingSummary(trends: TrendingTopic[]): string {
  const topTopics = trends.slice(0, 3).map((t) => t.query);
  return `Top trends: ${topTopics.join(', ')}`.substring(0, 100);
}

/**
 * Fetch recently used trend topics to avoid repetition
 * Returns trend query strings from the last N days
 */
async function getRecentlyUsedTrends(
  language: string,
  daysBack: number = 7
): Promise<Set<string>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);
    const startDateStr = startDate.toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('daily_buzz_challenges')
      .select('trending_topics')
      .eq('language', language)
      .gte('puzzle_date', startDateStr);

    if (error) {
      console.error('[BUZZ] Failed to fetch recently used trends:', error.message);
      return new Set();
    }

    // Extract all trend query strings from the results
    const usedTrends = new Set<string>();
    if (data) {
      for (const row of data) {
        const topics = row.trending_topics as TrendingTopic[] | null;
        if (topics) {
          for (const topic of topics) {
            // Normalize the query string for comparison
            usedTrends.add(topic.query.toLowerCase().trim());
          }
        }
      }
    }

    console.log(`[BUZZ] Found ${usedTrends.size} recently used trends (last ${daysBack} days)`);
    return usedTrends;
  } catch (error) {
    console.error('[BUZZ] Error fetching recently used trends:', error);
    return new Set();
  }
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
        image_alt_text: buzzData.image_alt_text,
        image_generation_cost_usd: buzzData.image_generation_cost_usd,
        social_content: buzzData.social_content,
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

// ==================== Prompt Example Functions ====================

/**
 * Interface for prompt improvement examples
 */
interface PromptExample {
  challenge_type: string;
  original_prompt: string;
  original_answer: string;
  feedback: string;
  improved_prompt?: string;
  improved_answer?: string;
  trend_topic?: string;
}

/**
 * Retrieve prompt improvement examples from database
 * Used to enhance the main AI prompt with learned corrections
 */
export async function getPromptExamples(
  language: string,
  limit: number = 30
): Promise<PromptExample[]> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('buzz_prompt_examples')
      .select('challenge_type, original_prompt, original_answer, feedback, improved_prompt, improved_answer, trend_topic')
      .eq('language', language)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Silently ignore table not found errors - table may not exist if migrations haven't run
      // In development/initial setup, this is expected
      if (error.message?.includes('Could not find the table')) {
        // Migration hasn't run yet, return empty examples
        return [];
      }
      console.warn('[BUZZ] Failed to fetch prompt examples:', error.message);
      return [];
    }

    return (data || []) as PromptExample[];
  } catch (err) {
    // Silently fail - prompt examples are optional for operation
    return [];
  }
}

/**
 * Store a new prompt example when admin provides feedback
 */
export async function storePromptExample(
  language: string,
  challengeType: string,
  originalPrompt: string,
  originalAnswer: string,
  feedback: string,
  createdBy: string,
  trendTopic?: string,
  improvedPrompt?: string,
  improvedAnswer?: string
): Promise<void> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabase.from('buzz_prompt_examples').insert({
      language,
      challenge_type: challengeType,
      original_prompt: originalPrompt,
      original_answer: originalAnswer,
      feedback,
      improved_prompt: improvedPrompt || null,
      improved_answer: improvedAnswer || null,
      trend_topic: trendTopic || null,
      created_by: createdBy,
    });

    if (error) {
      // Silently ignore table not found errors - table may not exist if migrations haven't run
      if (error.message?.includes('Could not find the table')) {
        console.debug('[BUZZ] Note: buzz_prompt_examples table not available yet (migrations pending)');
        return;
      }
      console.error('[BUZZ] Failed to store prompt example:', error);
      throw new Error('Failed to store feedback');
    }

    console.log(`[BUZZ] Stored prompt example for ${language}/${challengeType}`);
  } catch (err) {
    // If table doesn't exist, it's okay - we're in early setup
    if (err instanceof Error && err.message?.includes('Could not find the table')) {
      return;
    }
    throw err;
  }
}

// ==================== Single Challenge Regeneration ====================

/**
 * Build a focused prompt for regenerating a single challenge
 */
function buildSingleChallengePrompt(
  original: BuzzChallenge,
  feedback: string,
  language: string,
  trends: TrendingTopic[]
): string {
  const trendContext = trends
    .slice(0, 5)
    .map(t => `- ${t.query}`)
    .join('\n');

  const languageToneGuide = getLanguageToneGuide(language);

  return `You need to create a REPLACEMENT ${original.type} challenge for LexiClash, a word game.

**Language**: ${language}
**Challenge Type**: ${original.type}

---

## TONE GUIDE
${languageToneGuide}

---

## ORIGINAL CHALLENGE (REJECTED)
- Type: ${original.type}
- Trend: ${original.trend_topic}
- Prompt: "${original.prompt}"
- Answer: "${original.answer}"
- Hint: "${original.hint || 'None'}"
- Difficulty: ${original.difficulty}

---

## ADMIN FEEDBACK (WHAT WAS WRONG)
${feedback}

---

## AVAILABLE TRENDS
${trendContext}

---

## YOUR TASK
Generate ONE replacement challenge that:
1. **Addresses the feedback** - Fix the specific issue mentioned above
2. **Same type** - Must be "${original.type}"
3. **Can use same or different trend** - Pick whichever makes a better challenge
4. **Common dictionary word** - 3-12 letters (5 for wordle_guess), known by 90% of people
5. **Natural language** - Sound human, not robotic

---

## OUTPUT FORMAT (JSON only, no markdown)
{
  "type": "${original.type}",
  "trend_topic": "the trend you're using",
  "prompt": "the creative clue",
  "answer": "WORD_IN_CAPS",
  "hint": "a helpful nudge",
  "difficulty": "easy|medium|hard",
  "trending_context": "1 sentence: why this matters today"
}

Return ONLY the JSON object.`;
}

/**
 * Generate a single challenge using Gemini
 */
async function generateSingleChallengeWithAI(
  prompt: string
): Promise<BuzzChallenge> {
  const credentials = getVertexAICredentials();
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

  const model = vertexAI.getGenerativeModel({ model: GEMINI_MODEL });

  const generatePromise = model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1500,
      topP: 0.9,
    },
  });

  // Apply timeout to prevent hanging on slow AI responses
  const result = await withTimeout(
    generatePromise,
    AI_SINGLE_CHALLENGE_TIMEOUT_MS,
    'Single challenge regeneration'
  );

  const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

  if (!responseText) {
    throw new Error('No response from Gemini for single challenge');
  }

  // Parse single challenge JSON
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```json?\n?/g, '').replace(/```\n?$/g, '');
  }

  // Find JSON object boundaries
  const startIdx = jsonText.indexOf('{');
  const endIdx = jsonText.lastIndexOf('}');
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Invalid JSON structure from AI');
  }
  jsonText = jsonText.substring(startIdx, endIdx + 1);

  const challenge = JSON.parse(jsonText) as BuzzChallenge;

  // Validate structure
  if (!challenge.type || !challenge.prompt || !challenge.answer) {
    throw new Error('Invalid challenge structure from AI');
  }

  return challenge;
}

/**
 * Regenerate a single challenge within an existing Daily Buzz
 * Uses admin feedback to guide the regeneration
 *
 * @param date - Puzzle date (YYYY-MM-DD)
 * @param language - Language code
 * @param challengeIndex - Index of challenge to replace (0-based)
 * @param feedback - Admin feedback about what was wrong
 * @returns Updated DailyBuzzData
 */
export async function regenerateSingleChallenge(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string
): Promise<DailyBuzzData> {
  // Wrap entire function with timeout (60s to leave buffer for API's 70s maxDuration)
  const REGEN_FUNCTION_TIMEOUT_MS = 60_000;

  return withTimeout(
    regenerateSingleChallengeInternal(date, language, challengeIndex, feedback),
    REGEN_FUNCTION_TIMEOUT_MS,
    'Challenge regeneration'
  );
}

/**
 * Internal implementation of single challenge regeneration (called within timeout wrapper)
 */
async function regenerateSingleChallengeInternal(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string
): Promise<DailyBuzzData> {
  console.log(`[BUZZ] Regenerating challenge ${challengeIndex} for ${date}/${language}`);

  // 1. Fetch existing challenge data
  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  if (challengeIndex < 0 || challengeIndex >= existing.challenges.length) {
    throw new Error(`Invalid challenge index: ${challengeIndex}. Valid range: 0-${existing.challenges.length - 1}`);
  }

  const badChallenge = existing.challenges[challengeIndex];
  console.log(`[BUZZ] Original challenge: ${badChallenge.type} - "${badChallenge.answer}"`);

  // 2. Build targeted regeneration prompt
  const regenerationPrompt = buildSingleChallengePrompt(
    badChallenge,
    feedback,
    language,
    existing.trending_topics
  );

  // 3. Generate replacement via AI
  const newChallenge = await generateSingleChallengeWithAI(regenerationPrompt);
  console.log(`[BUZZ] New challenge generated: ${newChallenge.type} - "${newChallenge.answer}"`);

  // 4. Validate the new challenge (single-item validation)
  if (!validateSingleChallenge(newChallenge, language)) {
    throw new Error('Regenerated challenge failed validation - try different feedback');
  }

  // 5. Replace in the challenges array
  const updatedChallenges = [...existing.challenges];
  updatedChallenges[challengeIndex] = newChallenge;

  // 6. Update in database
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
 * Uses admin feedback to guide the regeneration
 *
 * @param date - Puzzle date (YYYY-MM-DD)
 * @param language - Language code
 * @param challengeType - Type of challenge to regenerate (e.g., 'wordle_guess', 'anagram')
 * @param feedback - Admin feedback about what was wrong
 * @returns Updated DailyBuzzData
 */
export async function regenerateChallengesByType(
  date: string,
  language: string,
  challengeType: string,
  feedback: string
): Promise<DailyBuzzData> {
  // Wrap entire function with timeout (60s to leave buffer for API's 70s maxDuration)
  // Note: This regenerates multiple challenges so might need more time, but we prioritize not timing out
  const REGEN_FUNCTION_TIMEOUT_MS = 60_000;

  return withTimeout(
    regenerateChallengesByTypeInternal(date, language, challengeType, feedback),
    REGEN_FUNCTION_TIMEOUT_MS,
    'Challenges-by-type regeneration'
  );
}

/**
 * Internal implementation of challenges-by-type regeneration (called within timeout wrapper)
 */
async function regenerateChallengesByTypeInternal(
  date: string,
  language: string,
  challengeType: string,
  feedback: string
): Promise<DailyBuzzData> {
  console.log(`[BUZZ] Regenerating all ${challengeType} challenges for ${date}/${language}`);

  // 1. Fetch existing challenge data
  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  // 2. Find all challenges of the specified type
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

  // 3. Regenerate each challenge of the specified type
  const updatedChallenges = [...existing.challenges];

  for (const index of indicesToRegenerate) {
    const badChallenge = existing.challenges[index];
    console.log(`[BUZZ] Regenerating ${challengeType} at index ${index}: "${badChallenge.answer}"`);

    // Build targeted regeneration prompt
    const regenerationPrompt = buildSingleChallengePrompt(
      badChallenge,
      feedback,
      language,
      existing.trending_topics
    );

    // Generate replacement via AI
    const newChallenge = await generateSingleChallengeWithAI(regenerationPrompt);
    console.log(`[BUZZ] New ${challengeType} generated: "${newChallenge.answer}"`);

    // Validate the new challenge
    if (!validateSingleChallenge(newChallenge, language)) {
      throw new Error(`Regenerated ${challengeType} challenge failed validation - try different feedback`);
    }

    updatedChallenges[index] = newChallenge;
  }

  // 4. Update in database
  const updatedData: DailyBuzzData = {
    ...existing,
    challenges: updatedChallenges,
  };

  await storeDailyBuzz(updatedData);

  console.log(`[BUZZ] Regenerated ${indicesToRegenerate.length} ${challengeType} challenge(s) successfully`);
  return updatedData;
}

// ==================== Partial Regeneration Functions ====================

/**
 * Valid fields that can be partially regenerated
 */
export type RegenerableField = 'prompt' | 'answer' | 'hint' | 'options' | 'all';

/**
 * Options for partial regeneration
 */
export interface PartialRegenerationOptions {
  fields: RegenerableField[];
  customPrompt?: string;
  additionalExampleIds?: string[];
}

/**
 * Build a specialized prompt for partial regeneration
 * Instructs AI to ONLY change specified fields while keeping others intact
 */
function buildPartialChallengePrompt(
  original: BuzzChallenge,
  feedback: string,
  language: string,
  fieldsToRegenerate: RegenerableField[],
  trends: TrendingTopic[],
  examples: PromptExample[]
): string {
  const isFullRegeneration = fieldsToRegenerate.includes('all');
  const trendContext = trends
    .slice(0, 5)
    .map(t => `- ${t.query}`)
    .join('\n');

  const languageToneGuide = getLanguageToneGuide(language);

  // Format "do not do" examples
  const examplesSection = examples.length > 0
    ? `
---

## LEARN FROM PAST MISTAKES (Do NOT repeat these)
${examples.slice(0, 10).map((ex, i) => `
### Bad Example ${i + 1} (${ex.challenge_type})
- Prompt: "${ex.original_prompt}"
- Answer: "${ex.original_answer}"
- Problem: ${ex.feedback}${ex.improved_prompt ? `\n- Better prompt: "${ex.improved_prompt}"` : ''}${ex.improved_answer ? `\n- Better answer: "${ex.improved_answer}"` : ''}
`).join('')}
`
    : '';

  // Build field-specific instructions
  let fieldInstructions: string;
  let preserveInstructions: string;

  if (isFullRegeneration) {
    fieldInstructions = `Generate a completely NEW replacement challenge that addresses the feedback.`;
    preserveInstructions = '';
  } else {
    const fieldsToChange = fieldsToRegenerate.join(', ');
    const fieldsToKeep = ['type', 'trend_topic', 'prompt', 'answer', 'hint', 'difficulty', 'trending_context', 'options']
      .filter(f => !fieldsToRegenerate.includes(f as RegenerableField) && f !== 'type')
      .join(', ');

    fieldInstructions = `Generate ONLY new values for: **${fieldsToChange}**`;
    preserveInstructions = `
**IMPORTANT - PRESERVE EXACTLY (copy verbatim):**
${!fieldsToRegenerate.includes('prompt') ? `- prompt: "${original.prompt}"` : ''}
${!fieldsToRegenerate.includes('answer') ? `- answer: "${original.answer}"` : ''}
${!fieldsToRegenerate.includes('hint') && original.hint ? `- hint: "${original.hint}"` : ''}
${original.options && !fieldsToRegenerate.includes('options') ? `- options: ${JSON.stringify(original.options)}` : ''}
- type: "${original.type}" (always keep)
- trend_topic: "${original.trend_topic}" (always keep)
- difficulty: "${original.difficulty}" (always keep)
- trending_context: "${original.trending_context}" (always keep)
`;
  }

  return `You need to ${isFullRegeneration ? 'create a REPLACEMENT' : 'PARTIALLY UPDATE a'} ${original.type} challenge for LexiClash, a word game.

**Language**: ${language}
**Challenge Type**: ${original.type}

---

## TONE GUIDE
${languageToneGuide}

---

## CURRENT CHALLENGE${isFullRegeneration ? ' (REJECTED - replace entirely)' : ' (update specific fields only)'}
- Type: ${original.type}
- Trend: ${original.trend_topic}
- Prompt: "${original.prompt}"
- Answer: "${original.answer}"
- Hint: "${original.hint || 'None'}"
- Difficulty: ${original.difficulty}
- Trending Context: "${original.trending_context}"
${original.options ? `- Options: ${JSON.stringify(original.options)}` : ''}

---

## ADMIN FEEDBACK
${feedback}
${preserveInstructions}
---

## AVAILABLE TRENDS
${trendContext}
${examplesSection}
---

## YOUR TASK
${fieldInstructions}

**Requirements:**
1. **Address the feedback** - Fix the specific issue mentioned above
2. **Same type** - Must be "${original.type}"
3. **Common dictionary word** - 3-12 letters (5 for wordle_guess), known by 90% of people
4. **Natural language** - Sound human, not robotic

---

## OUTPUT FORMAT (JSON only, no markdown)
{
  "type": "${original.type}",
  "trend_topic": "${original.trend_topic}",
  "prompt": "${isFullRegeneration || fieldsToRegenerate.includes('prompt') ? 'your new creative clue' : original.prompt}",
  "answer": "${isFullRegeneration || fieldsToRegenerate.includes('answer') ? 'NEW_ANSWER_IN_CAPS' : original.answer}",
  "hint": "${isFullRegeneration || fieldsToRegenerate.includes('hint') ? 'your new helpful nudge' : (original.hint || '')}",
  "difficulty": "${original.difficulty}",
  "trending_context": "${original.trending_context}"${original.options ? `,
  "options": ${isFullRegeneration || fieldsToRegenerate.includes('options') ? '["new", "options", "array"]' : JSON.stringify(original.options)}` : ''}
}

Return ONLY the JSON object.`;
}

/**
 * Get a preview of the AI prompt that would be sent for regeneration
 * Used by admin UI to show/edit the prompt before sending
 */
export async function getPromptPreview(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string,
  fieldsToRegenerate: RegenerableField[] = ['all']
): Promise<{ prompt: string; examples: PromptExample[] }> {
  // Fetch existing challenge data
  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  if (challengeIndex < 0 || challengeIndex >= existing.challenges.length) {
    throw new Error(`Invalid challenge index: ${challengeIndex}`);
  }

  const challenge = existing.challenges[challengeIndex];

  // Fetch "do not do" examples
  const examples = await getPromptExamples(language, 20);

  // Build the prompt
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
 * Uses admin feedback and partial field targeting
 *
 * @param date - Puzzle date (YYYY-MM-DD)
 * @param language - Language code
 * @param challengeIndex - Index of challenge to update (0-based)
 * @param feedback - Admin feedback about what was wrong
 * @param options - Partial regeneration options
 * @returns Updated DailyBuzzData
 */
export async function regeneratePartialChallenge(
  date: string,
  language: string,
  challengeIndex: number,
  feedback: string,
  options: PartialRegenerationOptions
): Promise<DailyBuzzData> {
  // Wrap entire function with timeout (60s to leave buffer for API's 70s maxDuration)
  const REGEN_FUNCTION_TIMEOUT_MS = 60_000;

  return withTimeout(
    regeneratePartialChallengeInternal(date, language, challengeIndex, feedback, options),
    REGEN_FUNCTION_TIMEOUT_MS,
    'Challenge regeneration'
  );
}

/**
 * Internal implementation of partial regeneration (called within timeout wrapper)
 */
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

  // 1. Fetch existing challenge data
  const existing = await getDailyBuzz(date, language);
  if (!existing) {
    throw new Error(`No challenge found for ${date} (${language})`);
  }

  if (challengeIndex < 0 || challengeIndex >= existing.challenges.length) {
    throw new Error(`Invalid challenge index: ${challengeIndex}. Valid range: 0-${existing.challenges.length - 1}`);
  }

  const originalChallenge = existing.challenges[challengeIndex];
  console.log(`[BUZZ] Original challenge: ${originalChallenge.type} - "${originalChallenge.answer}"`);

  // 2. Build or use custom prompt
  let regenerationPrompt: string;

  if (customPrompt) {
    // When using custom prompt, always append current admin feedback if not already present
    // This ensures each new decline reason is visible in the prompt
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
    // Fetch "do not do" examples
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

  // 3. Generate via AI
  const newChallenge = await generateSingleChallengeWithAI(regenerationPrompt);
  console.log(`[BUZZ] New challenge generated: ${newChallenge.type} - "${newChallenge.answer}"`);

  // 4. Validate the new challenge
  if (!validateSingleChallenge(newChallenge, language)) {
    throw new Error('Regenerated challenge failed validation - try different feedback');
  }

  // 5. For partial regeneration, merge with original (in case AI didn't preserve fields correctly)
  let finalChallenge: BuzzChallenge;

  if (isFullRegeneration) {
    finalChallenge = newChallenge;
  } else {
    // Merge: keep original fields that weren't supposed to change
    finalChallenge = {
      ...originalChallenge, // Start with original
      // Only override fields that were supposed to change
      ...(fields.includes('prompt') ? { prompt: newChallenge.prompt } : {}),
      ...(fields.includes('answer') ? { answer: newChallenge.answer } : {}),
      ...(fields.includes('hint') ? { hint: newChallenge.hint } : {}),
      ...(fields.includes('options') && newChallenge.options ? { options: newChallenge.options } : {}),
    };
  }

  // 6. Replace in the challenges array
  const updatedChallenges = [...existing.challenges];
  updatedChallenges[challengeIndex] = finalChallenge;

  // 7. Update in database
  const updatedData: DailyBuzzData = {
    ...existing,
    challenges: updatedChallenges,
  };

  await storeDailyBuzz(updatedData);

  console.log(`[BUZZ] Challenge ${challengeIndex} ${isFullRegeneration ? 'fully' : 'partially'} regenerated successfully`);
  return updatedData;
}

// ==================== Database Functions ====================

/**
 * Delete Daily Buzz challenge from database
 * This will cascade delete related attempts if FK constraint is set up
 * Used when admin wants a clean regeneration (not just overwrite)
 *
 * @param date - Puzzle date (YYYY-MM-DD)
 * @param language - Language code
 * @returns true if deleted, false if not found
 */
export async function deleteDailyBuzz(
  date: string,
  language: string
): Promise<boolean> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const region = REGION_MAP[language] || 'US';

    // First get the challenge ID to delete related attempts
    const { data: existing, error: fetchError } = await supabase
      .from('daily_buzz_challenges')
      .select('id')
      .eq('puzzle_date', date)
      .eq('language', language)
      .eq('region', region)
      .single();

    if (fetchError || !existing) {
      console.log(`[BUZZ] No existing challenge found to delete for ${date} (${language})`);
      return false;
    }

    // Delete related attempts first (in case no cascade)
    const { error: attemptsError } = await supabase
      .from('daily_buzz_attempts')
      .delete()
      .eq('challenge_id', existing.id);

    if (attemptsError) {
      console.warn(`[BUZZ] Failed to delete attempts: ${attemptsError.message}`);
      // Continue with challenge deletion anyway
    }

    // Delete the challenge
    const { error: deleteError } = await supabase
      .from('daily_buzz_challenges')
      .delete()
      .eq('id', existing.id);

    if (deleteError) {
      throw new Error(`Failed to delete Daily Buzz: ${deleteError.message}`);
    }

    console.log(`[BUZZ] Deleted Daily Buzz for ${date} (${language}) with ID ${existing.id}`);
    return true;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BUZZ] Failed to delete Daily Buzz:', errorMessage);
    throw error;
  }
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
