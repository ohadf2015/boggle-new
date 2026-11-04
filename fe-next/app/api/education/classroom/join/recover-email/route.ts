import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { createAdminClient } from '@/utils/supabase/admin';
import { findAuthUserByEmail } from '@/lib/education/findAuthUserByEmail';
import {
  correctionApply,
  correctionDecision,
  joinConfirmRedirect,
  normalizeEmail,
} from '@/lib/education/unconfirmedJoinEmail';
import { foldJoinCode } from '@/lib/education/joinCodeInput';
import logger from '@/utils/logger';

const bodySchema = z.object({
  email: z.string().min(3).max(254),
  nextEmail: z.string().min(3).max(254),
  locale: z.string().max(8).optional(),
  joinCode: z.string().max(12).optional(),
});

/**
 * POST /api/education/classroom/join/recover-email
 *
 * A student holding a class code whose signup email was typo'd. Resend is a
 * client call (no session required). This route only corrects the address,
 * and only when the account is still unconfirmed and the new address is one
 * or two edits away. Confirmed accounts are never rewritten.
 */
export async function POST(request: NextRequest) {
  const limited = checkApiRateLimit(request, 'join-recover-email', { maxRequests: 8, windowMs: 10 * 60_000 });
  if (!limited.success) {
    return NextResponse.json({ ok: false, code: 'RATE_LIMITED' }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'INVALID' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ ok: false, code: 'INVALID' }, { status: 400 });

  const decision = correctionDecision(parsed.data.email, parsed.data.nextEmail);
  const apply = correctionApply(decision, null);
  if (apply === 'invalid') return NextResponse.json({ ok: false, code: 'INVALID' }, { status: 400 });
  if (apply === 'not_a_typo') return NextResponse.json({ ok: false, code: 'NOT_A_TYPO' }, { status: 400 });

  const looked = await findAuthUserByEmail(normalizeEmail(parsed.data.email));
  if ('error' in looked) {
    logger.error('join recover-email lookup failed:', looked.error);
    return NextResponse.json({ ok: false, code: 'UNAVAILABLE' }, { status: 503 });
  }
  if (correctionApply('ok', looked.user) !== 'correct') {
    return NextResponse.json({ ok: true });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ ok: false, code: 'UNAVAILABLE' }, { status: 503 });

  const nextEmail = normalizeEmail(parsed.data.nextEmail);
  const updated = await admin.auth.admin.updateUserById(looked.user!.id, {
    email: nextEmail,
    email_confirm: false,
  });
  if (updated.error) {
    const taken = /already|registered|exists/i.test(updated.error.message);
    if (taken) return NextResponse.json({ ok: false, code: 'TAKEN' }, { status: 409 });
    logger.error('join recover-email update failed:', updated.error.message);
    return NextResponse.json({ ok: false, code: 'UNAVAILABLE' }, { status: 503 });
  }

  const code = parsed.data.joinCode ? foldJoinCode(parsed.data.joinCode) : '';
  const origin = (process.env.NEXT_PUBLIC_APP_URL || 'https://www.lexiclash.live').trim();
  const redirectTo = joinConfirmRedirect(origin, parsed.data.locale, code);
  const resent = await admin.auth.resend({
    type: 'signup',
    email: nextEmail,
    options: { emailRedirectTo: redirectTo },
  });
  if (resent.error) {
    logger.error('join recover-email resend failed:', resent.error.message);
  }
  return NextResponse.json({ ok: true });
}
