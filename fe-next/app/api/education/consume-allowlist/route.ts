import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { consumeTeacherAllowlist } from '@/lib/education/allowlist';

export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });

  const out = await consumeTeacherAllowlist({ userId: user.id, email: user.email });

  // The only caller is a fire-and-forget fetch in AuthContext with `.catch(() => {})`, so a
  // non-200 reaches nobody. Log server-side or a redemption failure is invisible again.
  if (out.error) {
    console.error('[consume-allowlist] redemption failed for', user.email, '-', out.error);
    return NextResponse.json({ ok: false, error: out.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...out });
}
