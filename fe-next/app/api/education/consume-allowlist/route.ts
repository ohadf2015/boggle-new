import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { consumeTeacherAllowlist } from '@/lib/education/allowlist';
import { applyPendingProGrants } from '@/lib/education/proGrantServer';

/**
 * Once-per-sign-in bridge for anything an admin granted to an EMAIL before that
 * email had an account: teacher access (allowlist) and complimentary Teacher Pro
 * (pending grants). One call, both bridges — so neither can be forgotten.
 */
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

  const pro = await applyPendingProGrants({ userId: user.id, email: user.email });
  if (!pro.applied && pro.error) {
    console.error('[consume-allowlist] pro grant claim failed for', user.email, '-', pro.error);
    return NextResponse.json({ ok: false, error: pro.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true, ...out, proGrantApplied: pro.applied });
}
