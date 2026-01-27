/**
 * Database Service for Daily Buzz
 * Handles Supabase operations for storing and retrieving buzz data
 */

import { REGION_MAP } from './constants';
import type { DailyBuzzData, PromptExample, TrendingTopic } from './types';

/**
 * Store Daily Buzz in database
 */
export async function storeDailyBuzz(buzzData: DailyBuzzData): Promise<void> {
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

/**
 * Delete Daily Buzz challenge from database
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
 * Fetch recently used trend topics to avoid repetition
 */
export async function getRecentlyUsedTrends(
  language: string,
  daysBack: number = 7
): Promise<Set<string>> {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    const usedTrends = new Set<string>();
    if (data) {
      for (const row of data) {
        const topics = row.trending_topics as TrendingTopic[] | null;
        if (topics) {
          for (const topic of topics) {
            usedTrends.add(topic.query.toLowerCase().trim());
          }
        }
      }
    }

    console.log(`[BUZZ] Found ${usedTrends.size} recently used trends (last ${daysBack} days)`);
    return usedTrends;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BUZZ] Error fetching recently used trends:', errorMessage);
    return new Set();
  }
}

/**
 * Check if feature flag is enabled
 */
export async function isFeatureFlagEnabled(flagName: string): Promise<boolean> {
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

    return data.enabled;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[BUZZ] Failed to check feature flag:', errorMessage);
    return false;
  }
}

/**
 * Retrieve prompt improvement examples from database
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
      if (error.message?.includes('Could not find the table')) {
        return [];
      }
      console.warn('[BUZZ] Failed to fetch prompt examples:', error.message);
      return [];
    }

    return (data || []) as PromptExample[];
  } catch (err) {
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
      if (error.message?.includes('Could not find the table')) {
        console.debug('[BUZZ] Note: buzz_prompt_examples table not available yet (migrations pending)');
        return;
      }
      const errorMessage = error.message || 'Unknown error';
      console.error('[BUZZ] Failed to store prompt example:', errorMessage);
      throw new Error('Failed to store feedback');
    }

    console.log(`[BUZZ] Stored prompt example for ${language}/${challengeType}`);
  } catch (err) {
    if (err instanceof Error && err.message?.includes('Could not find the table')) {
      return;
    }
    throw err;
  }
}
