import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminAuth } from '@/lib/auth/adminAuth';
import { revokeProGrant } from '@/lib/education/proGrantServer';

/** Admin: end a complimentary Pro grant early. The teacher drops back to free. */
export async function POST(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await verifyAdminAuth(request);
  if (!auth.success || !auth.user) return auth.response!;
  const { id } = await ctx.params;

  const result = await revokeProGrant({ grantId: id, revokedBy: auth.user.id });
  if (!result.ok) {
    if (result.error === 'not found') return NextResponse.json({ ok: false, error: result.error }, { status: 404 });
    console.error('[teacher-pro revoke] failed for', id, '-', result.error);
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
