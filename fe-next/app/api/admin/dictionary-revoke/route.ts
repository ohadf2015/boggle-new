/**
 * API Route: POST /api/admin/dictionary-revoke
 * Admin endpoint to remove words from the dictionary.
 * Handles: in-memory dict, approved file, community cache, DB un-promotion,
 * optional blacklisting, and Redis cache invalidation.
 */

import { NextRequest, NextResponse } from 'next/server';
import logger from '@/utils/logger';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import { captureApiError } from '@/utils/sentry';

const VALID_LANGUAGES = new Set(['en', 'he', 'sv', 'ja', 'es']);

export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const { word, language, addToBlacklist, reason } = body;

    // Validate required fields
    if (!word || typeof word !== 'string' || !word.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty "word" field' },
        { status: 400 }
      );
    }

    if (!language || !VALID_LANGUAGES.has(language)) {
      return NextResponse.json(
        { error: `Invalid language. Must be one of: ${[...VALID_LANGUAGES].join(', ')}` },
        { status: 400 }
      );
    }

    const trimmedWord = word.trim();

    // Dynamic imports to avoid logger initialization issues during build
    const { removeApprovedWord } = await import('@/backend/dictionary');
    const { removeFromCommunityCache } = await import('@/backend/modules/communityWordManager');

    // 1. Remove from in-memory dictionary and approved file
    await removeApprovedWord(trimmedWord, language);

    // 2. Remove from community cache
    removeFromCommunityCache(trimmedWord, language);

    // 3. Un-promote in database (reset approved_at and auto_promoted_at)
    const supabase = getSupabaseAdmin();
    if (supabase) {
      await supabase
        .from('invalid_word_submissions')
        .update({
          approved_at: null,
          auto_promoted_at: null,
          auto_promoted_by: null,
        })
        .eq('word', trimmedWord)
        .eq('language', language);

      // 4. Add negative votes to prevent re-promotion
      await supabase
        .from('word_scores')
        .upsert({
          word: trimmedWord,
          language,
          dislikes_count: 10,
          last_voted_at: new Date().toISOString(),
        }, {
          onConflict: 'word,language',
        });

      // 5. Optionally insert into blacklist
      if (addToBlacklist) {
        await supabase
          .from('bot_word_blacklist')
          .insert({
            word: trimmedWord,
            language,
            reason: reason || 'Admin revoked',
            created_by: authResult.user?.email || 'admin',
          });
      }
    }

    // 6. Invalidate Redis milog cache
    const { invalidateMilogCache } = await import('@/backend/services/milogWordVerifier');
    await invalidateMilogCache(trimmedWord);

    // Audit log
    logger.log(
      `[Admin] Dictionary revoke: "${trimmedWord}" (${language}) by ${authResult.user?.email}` +
      (addToBlacklist ? ' [blacklisted]' : '') +
      (reason ? ` reason: ${reason}` : '')
    );

    return NextResponse.json({
      success: true,
      word: trimmedWord,
      language,
      blacklisted: !!addToBlacklist,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    logger.error('[admin/dictionary-revoke] Error:', error);
    captureApiError(
      error instanceof Error ? error : new Error('Unknown error'),
      '/api/admin/dictionary-revoke',
      { method: 'POST', statusCode: 500 }
    );
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
