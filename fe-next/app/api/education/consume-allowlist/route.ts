import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { consumeTeacherAllowlist } from '@/lib/education/allowlist';

export async function POST() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user?.email) return NextResponse.json({ ok: false }, { status: 401 });
  const out = await consumeTeacherAllowlist({ userId: user.id, email: user.email });
  return NextResponse.json({ ok: true, ...out });
}
