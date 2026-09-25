import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import logger from '@/utils/logger';
import { notFoundWhenDisabled } from '@/lib/education/googleClassroomServer';
import { GC_GRADE_PASSBACK_SCOPES } from '@/lib/education/googleClassroomGrades';
import {
  DEFAULT_RETURN_TO,
  GC_COOKIE_PATH,
  GC_STATE_COOKIE,
  GC_TOKEN_COOKIE,
  exchangeCodeForToken,
  getOAuthConfig,
  safeReturnTo,
  sealCookie,
  unsealCookie,
} from '@/lib/education/googleClassroomOAuth';

/**
 * GET /api/education/google-classroom/oauth/callback?code&state
 * Verifies state + user binding, exchanges the code (PKCE), and seals the
 * access token into an httpOnly cookie that expires with the token. Always
 * redirects back to the reports page with ?gc=connected|denied|error so the UI
 * can show the outcome — failures are logged, never silent.
 */
export async function GET(req: NextRequest) {
  const off = notFoundWhenDisabled();
  if (off) return off;

  const params = req.nextUrl.searchParams;
  const state = await unsealCookie(req.cookies.get(GC_STATE_COOKIE)?.value);
  const returnTo = safeReturnTo(typeof state?.rt === 'string' ? state.rt : DEFAULT_RETURN_TO);

  const cfg = getOAuthConfig();
  // Behind the Express/Railway proxy the request host can be internal; the
  // configured redirect URI is the exact public origin Google sent us back to.
  const publicOrigin = cfg ? new URL(cfg.redirectUri).origin : req.nextUrl.origin;

  const back = (outcome: 'connected' | 'denied' | 'scopes' | 'error') => {
    const url = new URL(returnTo, publicOrigin);
    url.searchParams.set('gc', outcome);
    const res = NextResponse.redirect(url);
    res.cookies.set(GC_STATE_COOKIE, '', { path: GC_COOKIE_PATH, maxAge: 0 });
    return res;
  };

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (!state || !user || state.uid !== user.id || !params.get('state') || state.st !== params.get('state')) {
    logger.warn('[gc-oauth] callback rejected: missing/mismatched state or user', {
      hasState: Boolean(state),
      hasUser: Boolean(user),
    });
    return back('error');
  }
  if (params.get('error')) {
    logger.info('[gc-oauth] teacher declined consent', { error: params.get('error') });
    return back('denied');
  }
  const code = params.get('code');
  if (!code || !cfg || typeof state.v !== 'string') {
    logger.error('[gc-oauth] callback missing code or OAuth config');
    return back('error');
  }

  try {
    const token = await exchangeCodeForToken(cfg, code, state.v);
    // Google's consent screen lets a teacher untick individual scopes.
    const missing = GC_GRADE_PASSBACK_SCOPES.filter((s) => !token.scopes.includes(s));
    if (missing.length > 0) {
      logger.warn('[gc-oauth] teacher granted only part of the scopes', { missing });
      return back('scopes');
    }
    const ttl = Math.max(60, token.expiresIn - 60);
    const sealed = await sealCookie({ uid: user.id, at: token.accessToken, sc: token.scopes }, ttl);
    const res = back('connected');
    res.cookies.set(GC_TOKEN_COOKIE, sealed, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: GC_COOKIE_PATH,
      maxAge: ttl,
    });
    return res;
  } catch (err) {
    logger.error('[gc-oauth] token exchange failed', err);
    return back('error');
  }
}
