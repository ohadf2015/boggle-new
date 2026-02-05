/**
 * AI Content Moderation Service for Daily Buzz
 * Filters trends for child-friendly content and removes political topics
 * Uses Gemini Flash for fast, cost-effective content classification
 */

import { VertexAI } from '@google-cloud/vertexai';
import { AI_CONTENT_MODERATION_TIMEOUT_MS, POLITICAL_KEYWORDS_BY_LANGUAGE } from './constants';
import type { TrendingTopic } from './types';
import { withTimeout } from './utils';
import { getVertexAICredentials } from './vertexAIClient';

/**
 * Content moderation result for a single trend
 */
export interface ModerationResult {
  query: string;
  isApproved: boolean;
  reason?: string;
  category?: 'child_inappropriate' | 'political' | 'violent' | 'adult' | 'controversial' | 'approved';
}

/**
 * Batch moderation result
 */
export interface BatchModerationResult {
  approved: TrendingTopic[];
  rejected: Array<{ topic: TrendingTopic; reason: string; category: string }>;
  processingTimeMs: number;
}

/**
 * Quick keyword-based pre-filter for obvious political content
 * Runs before AI to save API calls
 */
export function quickPoliticalFilter(query: string, language: string): boolean {
  const lowercaseQuery = query.toLowerCase();

  const languageKeywords = POLITICAL_KEYWORDS_BY_LANGUAGE[language] || [];
  const englishKeywords = POLITICAL_KEYWORDS_BY_LANGUAGE.en || [];

  // Combine both language-specific and English keywords
  const allKeywords = Array.from(new Set([...languageKeywords, ...englishKeywords]));

  return allKeywords.some(keyword => lowercaseQuery.includes(keyword.toLowerCase()));
}

/**
 * Build the content moderation prompt for AI
 */
function buildModerationPrompt(trends: TrendingTopic[], language: string): string {
  const trendsList = trends
    .map((t, i) => `${i + 1}. "${t.query}" (context: ${t.trend_breakdown?.slice(0, 3).join(', ') || 'none'})`)
    .join('\n');

  return `You are a STRICT content moderator for a CHILDREN'S word game called LexiClash.
Your job is to filter trending topics to ensure they are SAFE and APPROPRIATE for players of ALL ages, including children as young as 6 years old.

🚨 CRITICAL: This content will be used to generate RIDDLES and WORD PUZZLES for children. Be EXTREMELY conservative.

## ABSOLUTE REJECTION CRITERIA - REJECT if topic involves ANY of:

### 1. POLITICAL CONTENT (ALWAYS REJECT - ZERO TOLERANCE)
- Elections, voting, campaigns, political parties, primaries, caucuses
- ANY politician by name (presidents, prime ministers, senators, etc.)
- Political movements, protests, rallies, demonstrations
- Government controversies, scandals, impeachment, investigations
- Political ideologies (left/right wing, liberal, conservative, socialist, etc.)
- Geopolitical conflicts, wars, military operations, peace negotiations
- Controversial policies (abortion, gun control, immigration, climate policy)
- Political commentary, opinion pieces, debates
- Anything that could be seen as "taking a side" on any issue

### 2. VIOLENCE & CONFLICT (ALWAYS REJECT - ZERO TOLERANCE)
- Wars, military operations, attacks, invasions, airstrikes
- Terrorism, bombings, shootings, hostage situations
- Crime news, murders, assaults, robberies, kidnappings
- Accidents with casualties or injuries
- Natural disasters with death tolls or victims
- Violent protests, riots, civil unrest
- School violence, mass shootings
- ANY topic involving death or serious injury

### 3. ADULT/MATURE CONTENT (ALWAYS REJECT)
- Dating, relationships, divorces, affairs of any public figures
- Scandals, affairs, controversial personal matters
- Drugs, alcohol, substance abuse, addiction
- Gambling (all forms)
- Any sexual or suggestive content
- Nightlife, bars, clubs, adult entertainment
- True crime stories, criminal trials, court cases

### 4. CONTROVERSIAL/DIVISIVE TOPICS (ALWAYS REJECT)
- Religious conflicts or controversial religious topics
- Racial or ethnic tensions, discrimination stories
- LGBTQ+ controversies or debates (not LGBTQ+ itself)
- Social justice controversies, "culture war" topics
- Conspiracy theories, misinformation topics
- Labor disputes, strikes, union conflicts
- Celebrity "cancellations" or controversy
- ANY topic that reasonable parents might object to

### 5. SENSITIVE CURRENT EVENTS (ALWAYS REJECT)
- Ongoing wars or conflicts (Ukraine, Gaza, etc.)
- Refugee crises, humanitarian disasters
- Pandemic-related controversies
- Economic crises, inflation debates
- Any "breaking news" about tragedies

## APPROVAL CRITERIA - ONLY APPROVE if topic is CLEARLY:
✅ Entertainment (movies, TV shows, music) - ONLY if family-friendly
✅ Technology (gadgets, apps, games) - ONLY if appropriate for kids
✅ Science & nature (discoveries, animals, space) - ONLY if positive/educational
✅ Food & cooking - general food topics
✅ Arts & culture - museums, art, performances
✅ Sports - game results, achievements (NOT player controversies or injuries)
✅ Travel & geography - destinations, landmarks
✅ Education & learning - academic achievements, discoveries
✅ Holidays & celebrations - cultural celebrations
✅ Pop culture - ONLY if 100% family-appropriate

## SPECIAL GUIDANCE FOR RIDDLE CONTENT
These topics will be turned into RIDDLES for children. Ask yourself:
- "Would I be comfortable if my 6-year-old asked me about this topic?"
- "Could this topic lead to a conversation about something inappropriate?"
- "Is there ANY angle of this topic that could be problematic?"

If the answer to ANY of these is uncertain, REJECT the topic.

## LANGUAGE CONTEXT
These trends are in ${language === 'he' ? 'Hebrew' : language === 'sv' ? 'Swedish' : language === 'ja' ? 'Japanese' : language === 'es' ? 'Spanish' : 'English'}.
Apply the SAME strict safety standards regardless of language.

## TRENDING TOPICS TO EVALUATE:
${trendsList}

## RESPONSE FORMAT
Respond ONLY with a JSON array. For each topic, provide:
- "index": topic number (1-based)
- "approved": true/false
- "category": "approved" | "political" | "violent" | "adult" | "controversial" | "child_inappropriate"
- "reason": brief reason if rejected (max 20 words)

Example response:
[
  {"index": 1, "approved": true, "category": "approved"},
  {"index": 2, "approved": false, "category": "political", "reason": "Election campaign topic"},
  {"index": 3, "approved": false, "category": "violent", "reason": "War-related content"}
]

🚨 FINAL REMINDER: When in ANY doubt, REJECT. Better to reject a safe topic than approve an inappropriate one.
This is content for CHILDREN. Be STRICT.
Return ONLY the JSON array, no other text.`;
}

/**
 * Parse AI moderation response
 */
function parseModerationResponse(responseText: string, originalTrends: TrendingTopic[]): ModerationResult[] {
  // Extract JSON from response (handle markdown code blocks)
  let jsonText = responseText.trim();

  const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonText = jsonMatch[1].trim();
  }

  // Find JSON array in response
  const arrayMatch = jsonText.match(/\[[\s\S]*\]/);
  if (!arrayMatch) {
    console.error('[MODERATION] Failed to find JSON array in response');
    // Fallback: approve all (fail-open for availability)
    return originalTrends.map(t => ({
      query: t.query,
      isApproved: true,
      category: 'approved' as const,
    }));
  }

  try {
    const parsed = JSON.parse(arrayMatch[0]) as Array<{
      index: number;
      approved: boolean;
      category?: string;
      reason?: string;
    }>;

    return originalTrends.map((trend, i) => {
      const result = parsed.find(p => p.index === i + 1);
      if (!result) {
        // If not found in response, approve (fail-open)
        return {
          query: trend.query,
          isApproved: true,
          category: 'approved' as const,
        };
      }

      return {
        query: trend.query,
        isApproved: result.approved,
        reason: result.reason,
        category: (result.category || (result.approved ? 'approved' : 'child_inappropriate')) as ModerationResult['category'],
      };
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MODERATION] Failed to parse moderation response:', errorMessage);
    // Fallback: approve all (fail-open)
    return originalTrends.map(t => ({
      query: t.query,
      isApproved: true,
      category: 'approved' as const,
    }));
  }
}

/**
 * Create a lightweight Vertex AI client for moderation
 * Uses Gemini Flash for speed and cost efficiency
 */
function createModerationClient(): VertexAI {
  const credentials = getVertexAICredentials();

  return new VertexAI({
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
}

/**
 * Filter trends using AI content moderation
 * First applies quick keyword filter, then uses AI for remaining trends
 *
 * @param trends - Trending topics to filter
 * @param language - Language code for context
 * @returns Filtered trends that are child-friendly and non-political
 */
export async function filterTrendsWithAI(
  trends: TrendingTopic[],
  language: string
): Promise<BatchModerationResult> {
  const startTime = Date.now();
  const approved: TrendingTopic[] = [];
  const rejected: Array<{ topic: TrendingTopic; reason: string; category: string }> = [];

  // Step 1: Quick keyword-based pre-filter
  const needsAIReview: TrendingTopic[] = [];

  for (const trend of trends) {
    if (quickPoliticalFilter(trend.query, language)) {
      rejected.push({
        topic: trend,
        reason: 'Political keyword detected',
        category: 'political',
      });
      console.log(`[MODERATION] Quick-rejected political trend: "${trend.query}"`);
    } else {
      needsAIReview.push(trend);
    }
  }

  // If no trends need AI review, return early
  if (needsAIReview.length === 0) {
    return {
      approved,
      rejected,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Step 2: AI moderation for remaining trends
  try {
    const vertexAI = createModerationClient();
    // Use Flash model for fast, cost-effective moderation
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = buildModerationPrompt(needsAIReview, language);

    const generatePromise = model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1, // Low temperature for consistent moderation
        maxOutputTokens: 2000,
      },
    });

    const result = await withTimeout(
      generatePromise,
      AI_CONTENT_MODERATION_TIMEOUT_MS,
      'Content moderation'
    );

    const responseText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    if (!responseText) {
      console.warn('[MODERATION] Empty AI response, approving all trends (fail-open)');
      approved.push(...needsAIReview);
    } else {
      const moderationResults = parseModerationResponse(responseText, needsAIReview);

      for (let i = 0; i < needsAIReview.length; i++) {
        const trend = needsAIReview[i];
        const modResult = moderationResults[i];

        if (modResult.isApproved) {
          approved.push(trend);
          console.log(`[MODERATION] AI approved: "${trend.query}"`);
        } else {
          rejected.push({
            topic: trend,
            reason: modResult.reason || 'AI moderation rejected',
            category: modResult.category || 'child_inappropriate',
          });
          console.log(`[MODERATION] AI rejected: "${trend.query}" (${modResult.category}: ${modResult.reason})`);
        }
      }
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MODERATION] AI moderation failed:', errorMessage);

    // Fail-open: approve all on error to maintain availability
    // The existing keyword-based filters still apply
    console.warn('[MODERATION] Falling back to approve all (fail-open policy)');
    approved.push(...needsAIReview);
  }

  const processingTimeMs = Date.now() - startTime;
  console.log(`[MODERATION] Completed in ${processingTimeMs}ms: ${approved.length} approved, ${rejected.length} rejected`);

  return {
    approved,
    rejected,
    processingTimeMs,
  };
}
