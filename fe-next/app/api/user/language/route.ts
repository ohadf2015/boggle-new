import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';
import { SUPPORTED_PUSH_LOCALES } from '@/backend/utils/pushTranslations';

// `explicit` distinguishes deliberate user choice (switcher click) from
// auto-sync on mount (URL/cookie/browser-derived). Without this flag the
// auto-sync would clobber a user's real preference whenever they happened
// to land on a non-default-locale URL — push notifications then go out in
// the wrong language. Auto-sync only fills NULL rows; explicit always wins.
const bodySchema = z.object({
  language: z.enum(SUPPORTED_PUSH_LOCALES as readonly [string, ...string[]]),
  explicit: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid language', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const update = supabase
      .from('profiles')
      .update({ language: parsed.data.language, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    const { error } = parsed.data.explicit === true
      ? await update
      : await update.is('language', null);

    if (error) {
      console.error('Failed to update profiles.language:', error);
      return NextResponse.json({ error: 'Failed to update language' }, { status: 500 });
    }

    return NextResponse.json({ success: true, language: parsed.data.language });
  } catch (err) {
    console.error('POST /api/user/language error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
