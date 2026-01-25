import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { getSupabaseAdmin } from '@/lib/admin/server';
import type { Language } from '@/types';
import {
  getWordBankWords,
  getWordBankStats,
  blockWord,
  unblockWord,
  deleteWordFromBank,
  seedWordBank,
  importWordsFromDictionary,
  getWordsFromWordBank,
  getWordsFromStaticList,
} from '@/lib/dailyChallenge/wordBankService';

const SUPPORTED_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'fr', 'de'] as const;

/**
 * GET /api/admin/daily-word/word-bank
 * Get words from the word bank with filtering and pagination
 *
 * Query params:
 * - language: Required language code
 * - status: Optional filter by status (active, blocked, used)
 * - source: Optional filter by source (static, dictionary, ai, admin, wikipedia)
 * - search: Optional search term
 * - limit: Optional limit (default 50)
 * - offset: Optional offset for pagination
 * - action: Optional action ('stats' to get statistics, 'random' to get random words)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const language = searchParams.get('language') as Language;
    const action = searchParams.get('action');

    if (!language || !SUPPORTED_LANGUAGES.includes(language as typeof SUPPORTED_LANGUAGES[number])) {
      return NextResponse.json({ error: 'Valid language is required' }, { status: 400 });
    }

    // Action: Get statistics
    if (action === 'stats') {
      const stats = await getWordBankStats(supabase, language);
      return NextResponse.json({ success: true, stats });
    }

    // Action: Get random words (for preview/testing)
    if (action === 'random') {
      const count = parseInt(searchParams.get('count') || '10', 10);
      const excludeWords = new Set<string>();

      const words = await getWordsFromWordBank(supabase, language, count, excludeWords);

      // If not enough from word bank, supplement with static list
      if (words.length < count) {
        const remaining = count - words.length;
        const usedWords = new Set(words.map(w => w.word));
        const staticWords = getWordsFromStaticList(language, remaining, usedWords);
        words.push(...staticWords);
      }

      return NextResponse.json({ success: true, words });
    }

    // Default: List words with pagination
    const status = searchParams.get('status') as 'active' | 'blocked' | 'used' | null;
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = await getWordBankWords(supabase, language, {
      status: status || undefined,
      source: source || undefined,
      search: search || undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      words: result.words,
      total: result.total,
      pagination: {
        limit,
        offset,
        hasMore: offset + result.words.length < result.total,
      },
    });
  } catch (error) {
    console.error('Word bank GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/daily-word/word-bank
 * Add words to the word bank or perform actions
 *
 * Body:
 * - action: 'add' | 'import' | 'seed' | 'block' | 'unblock' | 'delete'
 * - language: Required language code
 * - words: Array of words (for 'add' and 'import')
 * - word: Single word (for 'block', 'unblock', 'delete')
 * - source: Source type for imports (default 'admin')
 * - reason: Optional reason for blocking
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await verifyAdminAuth(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { action, language, words, word, source, reason } = body;

    if (!language || !SUPPORTED_LANGUAGES.includes(language)) {
      return NextResponse.json({ error: 'Valid language is required' }, { status: 400 });
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    switch (action) {
      case 'add':
      case 'import': {
        if (!words || !Array.isArray(words) || words.length === 0) {
          return NextResponse.json({ error: 'Words array is required' }, { status: 400 });
        }

        if (words.length > 1000) {
          return NextResponse.json({ error: 'Maximum 1000 words per import' }, { status: 400 });
        }

        const importSource = source || 'admin';
        const result = await importWordsFromDictionary(
          supabase,
          language as Language,
          words,
          importSource as 'dictionary' | 'wikipedia' | 'admin'
        );

        return NextResponse.json({
          success: true,
          message: `Imported ${result.inserted} words (${result.skipped} skipped, ${result.errors} errors)`,
          result,
        });
      }

      case 'seed': {
        const result = await seedWordBank(supabase, language as Language);
        return NextResponse.json({
          success: true,
          message: `Seeded ${result.inserted} words from static list (${result.skipped} skipped, ${result.errors} errors)`,
          result,
        });
      }

      case 'block': {
        if (!word || typeof word !== 'string') {
          return NextResponse.json({ error: 'Word is required' }, { status: 400 });
        }

        const blocked = await blockWord(
          supabase,
          word,
          language as Language,
          authResult.user!.id,
          reason
        );

        if (!blocked) {
          return NextResponse.json({ error: 'Word not found in word bank' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: `Word "${word}" has been blocked`,
        });
      }

      case 'unblock': {
        if (!word || typeof word !== 'string') {
          return NextResponse.json({ error: 'Word is required' }, { status: 400 });
        }

        const unblocked = await unblockWord(supabase, word, language as Language);

        if (!unblocked) {
          return NextResponse.json({ error: 'Word not found in word bank' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: `Word "${word}" has been unblocked`,
        });
      }

      case 'delete': {
        if (!word || typeof word !== 'string') {
          return NextResponse.json({ error: 'Word is required' }, { status: 400 });
        }

        const deleted = await deleteWordFromBank(supabase, word, language as Language);

        if (!deleted) {
          return NextResponse.json({ error: 'Failed to delete word' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: `Word "${word}" has been permanently deleted`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}. Valid actions: add, import, seed, block, unblock, delete` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Word bank POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
