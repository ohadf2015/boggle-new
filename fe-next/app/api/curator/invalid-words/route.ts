import { NextRequest, NextResponse } from 'next/server';
import { verifyCuratorAuth } from '@/lib/auth/curatorAuth';
import { createClient } from '@/utils/supabase/server';
import { SUPPORTED_LANGUAGES } from '@/lib/curator/curatorScope';
import { captureApiError } from '@/utils/sentry';

/**
 * GET /api/curator/invalid-words?lang=he
 *   → { words: [...] } — rejected / not-yet-approved word submissions for the
 *   curator's language, busiest first. Curator-only for that language (RLS also
 *   scopes the underlying table; this is defence in depth + language validation).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const lang = new URL(request.url).searchParams.get('lang') ?? '';
  if (!SUPPORTED_LANGUAGES.includes(lang as never)) {
    return NextResponse.json({ error: 'invalid_language' }, { status: 400 });
  }

  const auth = await verifyCuratorAuth(request, { language: lang });
  if (!auth.success) {
    return auth.response ?? NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('invalid_word_submissions')
      .select('id, word, language, submission_count, reason, last_submitted_at')
      .eq('language', lang)
      .is('approved_at', null)
      .order('submission_count', { ascending: false })
      .limit(100);
    if (error) throw error;
    return NextResponse.json({ words: data ?? [] }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    captureApiError(
      error instanceof Error ? error : new Error(String(error)),
      '/api/curator/invalid-words',
      { method: 'GET' }
    );
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
