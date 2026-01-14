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
  type: 'anagram' | 'fill_blank' | 'word_chain' | 'definition_match' | 'trending_trio' | 'riddle' | 'wordle_guess';
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

// Thinking budget for extended reasoning (0 = disabled, max = 32768 for 2.5-pro, 24576 for 2.5-flash)
const THINKING_BUDGET = parseInt(process.env.VERTEX_AI_THINKING_BUDGET || '8192', 10);

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
 * PRIORITIZES rising trends (highest increase_percentage) over static popular trends
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

  const filtered = trends.filter((trend) => {
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

    const result = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig,
    } as Parameters<typeof model.generateContent>[0]);

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

/**
 * Select trends for challenge generation
 * Freely chooses from available trends, prioritizing rising trends
 * while maintaining diversity across categories
 */
function selectTrendsForChallenge(trends: TrendingTopic[]): TrendingTopic[] {
  if (trends.length <= 5) return trends;

  const selected: TrendingTopic[] = [];
  const usedCategories = new Set<string>();

  // First pass: prioritize fastest-rising trends (increase_percentage > 100%)
  const risingFast = trends.filter(t => (t.increase_percentage ?? 0) > 100);
  for (const trend of risingFast) {
    if (selected.length >= 5) break;
    const category = trend.categories?.[0]?.name ?? 'General';
    if (!usedCategories.has(category) || selected.length < 3) {
      selected.push(trend);
      usedCategories.add(category);
    }
  }

  // Second pass: fill remaining slots with rising trends (any increase_percentage > 0)
  const rising = trends.filter(t =>
    (t.increase_percentage ?? 0) > 0 && !selected.includes(t)
  );
  for (const trend of rising) {
    if (selected.length >= 5) break;
    selected.push(trend);
  }

  // Third pass: fill with any remaining if needed
  for (const trend of trends) {
    if (selected.length >= 5) break;
    if (!selected.includes(trend)) {
      selected.push(trend);
    }
  }

  return selected;
}

/**
 * Build prompt for Gemini to generate word challenges
 * Uses sophisticated lateral thinking approach for unpredictable connections
 */
function buildAIPrompt(
  trends: TrendingTopic[],
  language: string,
  region: string
): string {
  // Select trends freely - prioritize rising trends (already sorted by increase_percentage)
  // Take variety: mix of fastest-rising and high-volume for diversity
  const selectedTrends = selectTrendsForChallenge(trends);

  const trendsContext = selectedTrends
    .map((trend, idx) => {
      const contextParts = trend.trend_breakdown?.slice(0, 3).join(', ') ||
        trend.categories?.map(c => c.name).join(', ') ||
        'Currently trending';
      const volumeDisplay = trend.search_volume
        ? `${(trend.search_volume / 1000).toFixed(0)}K+`
        : 'trending';
      const riseIndicator = trend.increase_percentage
        ? ` 🔥 RISING +${trend.increase_percentage}%`
        : '';
      return `${idx + 1}. "${trend.query}" - ${volumeDisplay} searches${riseIndicator}\n   Context: ${contextParts}`;
    })
    .join('\n\n');

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

  return `You are a witty puzzle-crafter for LexiClash, a neo-brutalist word game that doesn't take itself too seriously. Think of yourself as that clever friend who always has the perfect pun at parties—the one who makes people groan AND laugh at the same time.

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
   - Format: "Phrase with _____ (N letters)" - one underscore per letter
   - Trend "Election" → "Voters stood in _____ for hours (4 letters)" → LINE
   - Trend "Heat Wave" → "People escaped to the _____ (5 letters)" → SHADE

3. **word_chain**: Connect two unexpectedly related words
   - Trend "Tech Layoffs" → OFFICE → ? → BOX (packing up desks)
   - Trend "World Cup" → GRASS → ? → SLIDE (tackle move)

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
  ]
}

**trending_summary Examples by Language**:
- English: "Politics & Popcorn 🍿" / "Tech Drama, Again" / "Sports Gone Wild"
- Hebrew: "בלאגן יומי" / "חדשות חמות 🔥" / "הכל הפוך"
- Swedish: "Lagom Kaos" / "Veckans Snackis" / "Typiskt Tisdag"
- Japanese: "今日もカオス" / "バズってる話題" / "トレンド祭り"
- Spanish: "Día de Locos" / "Tendencias Picantes 🌶️" / "El Mundo Anda Loco"

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

Return ONLY the JSON object. Make every challenge feel fresh, clever, and connected to TODAY—like it was written by a witty friend, not a corporate chatbot.`;
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
