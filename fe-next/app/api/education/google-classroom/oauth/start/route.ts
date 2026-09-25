import { NextResponse, type NextRequest } from 'next/server';
import logger from '@/utils/logger';
import { gateProTeacher } from '@/lib/education/googleClassroomServer';
import {
  GC_COOKIE_PATH,
  GC_STATE_COOKIE,
  buildGoogleAuthUrl,
  getOAuthConfig,
  pkceChallenge,
  randomUrlToken,
  safeReturnTo,
  sealCookie,
} from '@/lib/education/googleClassroomOAuth';

/**
 * GET /api/education/google-classroom/oauth/start?returnTo=/he/teacher/reports
 * Teacher Pro → Google consent for the grade-passback scopes (incremental,
 * PKCE S256). State + verifier + user id are sealed into a 10-min cookie.
 */
export async function GET(req: NextRequest) {
  const gate = await gateProTeacher();
  if (!gate.ok) return gate.response;

  const cfg = getOAuthConfig();
  if (!cfg) {
    logger.error('[gc-oauth] GOOGLE_CLASSROOM_CLIENT_ID/SECRET/REDIRECT_URI or GC_TOKEN_COOKIE_SECRET missing');
    return NextResponse.json({ ok: false, error: 'oauth_not_configured' }, { status: 500 });
  }

  const state = randomUrlToken(24);
  const verifier = randomUrlToken(48);
  const returnTo = safeReturnTo(req.nextUrl.searchParams.get('returnTo'));
  const sealed = await sealCookie({ uid: gate.user.id, st: state, v: verifier, rt: returnTo }, 600);

  const res = NextResponse.redirect(
    buildGoogleAuthUrl(cfg, { state, codeChallenge: pkceChallenge(verifier), loginHint: gate.user.email }),
  );
  res.cookies.set(GC_STATE_COOKIE, sealed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    // Lax (not Strict): the cookie must ride Google's top-level redirect back.
    sameSite: 'lax',
    path: GC_COOKIE_PATH,
    maxAge: 600,
  });
  return res;
}
