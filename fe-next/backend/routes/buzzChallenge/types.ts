/**
 * Buzz Challenge Types and Helpers
 */

import { Request, Response, NextFunction } from 'express';

const { getSupabase, isSupabaseConfigured } = require('../../modules/supabaseServer');
import logger from '../../utils/logger';

// Language to region mapping
export const REGION_MAP: Record<string, string> = {
  en: 'US', he: 'IL', sv: 'SE', ja: 'JP', es: 'ES',
};

export const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

export interface AdminUser {
  id: string;
  email: string;
  username?: string;
}

export interface AdminRequest extends Request {
  adminUser?: AdminUser;
}

interface SocialPlatformContent {
  text: string;
  hashtags: string[];
}

interface SocialContentResponse {
  x: SocialPlatformContent;
  instagram: SocialPlatformContent;
  tiktok: SocialPlatformContent;
}

export interface BuzzApiResponse {
  id?: number;
  puzzleDate: string;
  language: string;
  trendingSummary: string;
  trendingTopics: Array<{
    query: string;
    volume?: number;
    newsSnippet?: string;
  }>;
  challenges: Array<{
    type: string;
    trendTopic: string;
    prompt: string;
    answer: string;
    hint?: string;
    difficulty: string;
    trendingContext?: string;
    options?: string[];
  }>;
  imageUrl?: string;
  socialContent?: SocialContentResponse;
}

/**
 * Map backend challenge types to frontend-expected types
 */
function mapChallengeType(backendType: string): string {
  const typeMap: Record<string, string> = {
    anagram: 'scrambled',
    fill_blank: 'fillBlank',
    word_chain: 'chain',
    definition_match: 'spotOn',
    trending_trio: 'trio',
    riddle: 'scrambled',
    wordle_guess: 'wordle',
  };
  return typeMap[backendType] || backendType;
}

/**
 * Transform database response (snake_case) to frontend format (camelCase)
 */
export function transformBuzzResponse(dbData: Record<string, unknown>): BuzzApiResponse {
  let socialContent: SocialContentResponse | undefined;
  const sc = dbData.social_content as Record<string, unknown> | null | undefined;
  if (sc && sc.x && sc.instagram && sc.tiktok) {
    const xData = sc.x as Record<string, unknown>;
    const instagramData = sc.instagram as Record<string, unknown>;
    const tiktokData = sc.tiktok as Record<string, unknown>;
    socialContent = {
      x: { text: xData.text as string, hashtags: xData.hashtags as string[] },
      instagram: { text: instagramData.text as string, hashtags: instagramData.hashtags as string[] },
      tiktok: { text: tiktokData.text as string, hashtags: tiktokData.hashtags as string[] },
    };
  }

  return {
    id: dbData.id as number | undefined,
    puzzleDate: dbData.puzzle_date as string,
    language: dbData.language as string,
    trendingSummary: dbData.trending_summary as string,
    trendingTopics: (dbData.trending_topics as Array<Record<string, unknown>> || []).map((topic) => ({
      query: topic.query as string,
      volume: topic.search_volume as number | undefined,
      newsSnippet: topic.news_snippet as string | undefined,
    })),
    challenges: (dbData.challenges as Array<Record<string, unknown>> || []).map((challenge) => ({
      type: mapChallengeType(challenge.type as string),
      trendTopic: challenge.trend_topic as string,
      prompt: challenge.prompt as string,
      answer: challenge.answer as string,
      hint: challenge.hint as string | undefined,
      difficulty: challenge.difficulty as string,
      trendingContext: challenge.trending_context as string | undefined,
      options: challenge.options as string[] | undefined,
    })),
    imageUrl: dbData.image_url as string | undefined,
    socialContent,
  };
}

/**
 * Admin authentication middleware for Buzz admin routes
 */
export async function buzzAdminAuth(req: AdminRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('BUZZ_ADMIN', 'Missing auth header');
    res.status(401).json({ error: 'Missing authorization header' });
    return;
  }

  const token = authHeader.substring(7);
  if (!isSupabaseConfigured()) {
    res.status(503).json({ error: 'Auth service not available' });
    return;
  }

  try {
    const supabase = getSupabase();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      logger.warn('BUZZ_ADMIN', 'Invalid token');
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, username')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.is_admin) {
      logger.warn('BUZZ_ADMIN', `Non-admin access attempt by ${user.email}`);
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    req.adminUser = { id: user.id, email: user.email!, username: profile.username };
    logger.debug('BUZZ_ADMIN', `Admin access: ${user.email} -> ${req.method} ${req.path}`);
    next();
  } catch (error) {
    const err = error as Error;
    logger.error('BUZZ_ADMIN', `Auth error: ${err.message}`);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
