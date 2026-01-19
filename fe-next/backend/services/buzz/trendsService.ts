/**
 * Trends Service for Daily Buzz
 * Handles fetching, filtering, and selecting trending topics
 */

import { TrendingTopic } from '../serpApiClient';
import { matchesExpectedScript } from '../../utils/scriptDetection';
import {
  BANNED_KEYWORDS,
  LOW_PRIORITY_CATEGORIES,
  MAX_SPORTS_IN_FILTER,
  SPORTS_KEYWORDS,
  SPORTS_KEYWORDS_BY_LANGUAGE,
  STOP_WORDS_BY_LANGUAGE,
} from './constants';
import type { BuzzChallenge } from './types';

/**
 * Get fallback topics when SERP API fails or returns no results
 * Returns generic, family-friendly topics for word challenges
 */
export function getFallbackTopics(_language: string): TrendingTopic[] {
  const fallbackTopics: TrendingTopic[] = [
    {
      query: 'technology',
      search_volume: 100000,
      active: true,
      categories: [{ id: 5, name: 'Science & Technology' }],
      trend_breakdown: ['innovation', 'digital', 'software', 'computer'],
    },
    {
      query: 'nature',
      search_volume: 80000,
      active: true,
      categories: [{ id: 8, name: 'Science' }],
      trend_breakdown: ['environment', 'wildlife', 'forest', 'ocean'],
    },
    {
      query: 'music',
      search_volume: 90000,
      active: true,
      categories: [{ id: 3, name: 'Entertainment' }],
      trend_breakdown: ['melody', 'rhythm', 'concert', 'artist'],
    },
    {
      query: 'science',
      search_volume: 75000,
      active: true,
      categories: [{ id: 8, name: 'Science' }],
      trend_breakdown: ['discovery', 'research', 'experiment', 'theory'],
    },
    {
      query: 'travel',
      search_volume: 85000,
      active: true,
      categories: [{ id: 6, name: 'Travel' }],
      trend_breakdown: ['journey', 'destination', 'adventure', 'explore'],
    },
  ];

  console.log(`[BUZZ] Using ${fallbackTopics.length} fallback topics`);
  return fallbackTopics;
}

/**
 * Check if a trend query contains sports keywords for a specific language
 */
export function isSportsRelatedTrend(query: string, language: string): boolean {
  const lowercaseQuery = query.toLowerCase();

  const languageKeywords = SPORTS_KEYWORDS_BY_LANGUAGE[language] || [];
  const englishKeywords = SPORTS_KEYWORDS_BY_LANGUAGE.en || [];

  // Combine both language-specific and English keywords
  const allKeywords = Array.from(new Set([...languageKeywords, ...englishKeywords]));

  const isSports = allKeywords.some(keyword => lowercaseQuery.includes(keyword.toLowerCase()));

  if (isSports) {
    console.log(`[BUZZ] Detected sports trend: "${query}" (language: ${language})`);
  }

  return isSports;
}

/**
 * Check if a challenge is sports-related based on its topic
 */
export function isSportsRelatedChallenge(challenge: BuzzChallenge): boolean {
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
export function isLowPriorityCategory(trend: TrendingTopic): boolean {
  const categoryNames = trend.categories?.map(c => c.name) ?? [];
  return categoryNames.some(name =>
    LOW_PRIORITY_CATEGORIES.some(lowPri =>
      name.toLowerCase().includes(lowPri.toLowerCase())
    )
  );
}

/**
 * Filter trending topics for family-friendly, word-game-suitable content
 * PRIORITIZES rising trends (highest increase_percentage) over static popular trends
 * Also filters out trends that don't match the expected language script
 * And filters out recently used trends to ensure freshness
 * LIMITS sports trends to MAX_SPORTS_IN_FILTER to ensure topic diversity
 */
export function filterTrends(
  trends: TrendingTopic[],
  language: string,
  recentlyUsedTrends?: Set<string>
): TrendingTopic[] {
  // First pass: apply all filters except sports limit
  const basicFiltered = trends.filter((trend) => {
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
    if (BANNED_KEYWORDS.some((keyword) => query.includes(keyword))) {
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
  const sorted = basicFiltered.sort((a, b) => {
    const aIncrease = a.increase_percentage ?? 0;
    const bIncrease = b.increase_percentage ?? 0;

    if (bIncrease !== aIncrease) {
      return bIncrease - aIncrease;
    }

    return (b.search_volume ?? 0) - (a.search_volume ?? 0);
  });

  // Second pass: limit sports trends using multi-language detection
  let sportsCount = 0;
  const diverseFiltered: TrendingTopic[] = [];

  for (const trend of sorted) {
    const isSports = isSportsRelatedTrend(trend.query, language) || isLowPriorityCategory(trend);

    if (isSports) {
      if (sportsCount < MAX_SPORTS_IN_FILTER) {
        diverseFiltered.push(trend);
        sportsCount++;
        console.log(`[BUZZ] Including sports trend (${sportsCount}/${MAX_SPORTS_IN_FILTER}): "${trend.query}"`);
      } else {
        console.log(`[BUZZ] Filtered sports trend (limit reached): "${trend.query}"`);
      }
    } else {
      diverseFiltered.push(trend);
    }
  }

  console.log(`[BUZZ] Filtered trends (${diverseFiltered.length} total, ${sportsCount} sports): ${diverseFiltered.slice(0, 5).map(t =>
    `${t.query} (+${t.increase_percentage ?? 0}%)`
  ).join(', ')}`);

  return diverseFiltered.slice(0, 10);
}

/**
 * Select trends for challenge generation
 * Prioritizes rising trends while maintaining diversity across categories
 */
export function selectTrendsForChallenge(trends: TrendingTopic[]): TrendingTopic[] {
  if (trends.length <= 5) return trends;

  const selected: TrendingTopic[] = [];
  const categoryCount = new Map<string, number>();
  const MAX_PER_CATEGORY = 2;
  const MAX_SPORTS = 1;

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

    return currentCount < MAX_PER_CATEGORY;
  }

  function addTrend(trend: TrendingTopic): void {
    const category = trend.categories?.[0]?.name ?? 'General';
    selected.push(trend);
    categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
  }

  // Separate sports and non-sports trends
  const nonSportsTrends = trends.filter(t => !isLowPriorityCategory(t));
  const sportsTrends = trends.filter(t => isLowPriorityCategory(t));

  // First pass: prioritize fastest-rising NON-SPORTS trends
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

  // Third pass: add up to 1 sports trend if we have room
  const risingSports = sportsTrends.filter(t => (t.increase_percentage ?? 0) > 50);
  for (const trend of risingSports) {
    if (selected.length >= 5) break;
    if (canAddTrend(trend)) {
      addTrend(trend);
      break;
    }
  }

  // Fourth pass: fill remaining slots with any non-sports trends
  for (const trend of nonSportsTrends) {
    if (selected.length >= 5) break;
    if (!selected.includes(trend) && canAddTrend(trend)) {
      addTrend(trend);
    }
  }

  // Final pass: fill with remaining trends while still respecting category limits
  for (const trend of trends) {
    if (selected.length >= 5) break;
    if (!selected.includes(trend) && canAddTrend(trend)) {
      addTrend(trend);
    }
  }

  // Ultra-fallback: if still not enough trends, add ANY remaining
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
 */
export function getStopWords(language: string): Set<string> {
  return new Set(STOP_WORDS_BY_LANGUAGE[language] || STOP_WORDS_BY_LANGUAGE.en);
}

/**
 * Extract common keywords from trend breakdowns
 */
export function extractKeywordsFromBreakdowns(trends: TrendingTopic[], language: string): string[] {
  const stopWords = getStopWords(language);
  const keywords = new Map<string, number>();

  for (const trend of trends) {
    if (!trend.trend_breakdown) continue;

    for (const phrase of trend.trend_breakdown) {
      const words = phrase
        .toLowerCase()
        .split(/[\s,.\-:;!?"'()]+/)
        .filter(word =>
          word.length >= 3 &&
          word.length <= 12 &&
          !stopWords.has(word) &&
          !/^\d+$/.test(word) &&
          !/^[^a-zA-Zא-ת\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(word)
        );

      words.forEach(word => {
        keywords.set(word, (keywords.get(word) ?? 0) + 1);
      });
    }
  }

  return Array.from(keywords.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Generate trending summary from topics
 */
export function generateTrendingSummary(trends: TrendingTopic[]): string {
  const topTopics = trends.slice(0, 3).map((t) => t.query);
  return `Top trends: ${topTopics.join(', ')}`.substring(0, 100);
}
