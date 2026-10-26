import { NextResponse } from 'next/server';
import { getAuthedUser } from '@/lib/auth/getAuthedUser';
import { createAdminClient } from '@/utils/supabase/admin';
import logger from '@/utils/logger';
import { isIdentityLinkingEnabled } from '@/lib/auth/externalIdentity';
import { recordSignInIdentities, type SignInUserLike } from '@/lib/auth/recordSignInIdentities';

/** POST /api/auth/external-identity — links the caller's Google/Microsoft identities. Flagged OFF by default. */
export async function POST(req: Request) {
  if (!isIdentityLinkingEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const authed = await getAuthedUser(req);
  if (!authed) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  if (!admin) {
    logger.error('[external-identity] SUPABASE_SERVICE_ROLE_KEY missing');
    return NextResponse.json({ ok: false, error: 'service_role_missing' }, { status: 500 });
  }

  const { data, error } = await admin.auth.admin.getUserById(authed.id);
  if (error || !data?.user) {
    logger.error('[external-identity] user read failed', error);
    return NextResponse.json({ ok: false, error: 'user_read_failed' }, { status: 500 });
  }

  const result = await recordSignInIdentities(admin, data.user as unknown as SignInUserLike);
  return NextResponse.json({ ok: true, ...result });
}
