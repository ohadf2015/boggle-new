/**
 * Teacher-side Google OAuth for Classroom grade passback. Server-only.
 *
 * Per-session flow, no refresh token, no DB (see googleClassroomGrades.ts header
 * for why): start → Google consent (PKCE S256, incremental scopes) → callback
 * exchanges the code and seals the access token into an httpOnly cookie.
 * Cookies are encrypted with AES-256-GCM (jose `dir`), keyed by
 * sha256(GC_TOKEN_COOKIE_SECRET), and carry the Supabase user id they belong to.
 */

import { createHash, randomBytes } from 'crypto';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { GC_GRADE_PASSBACK_SCOPES } from './googleClassroomGrades';

export const GC_TOKEN_COOKIE = 'gc_grade_token';
export const GC_STATE_COOKIE = 'gc_oauth_state';
export const GC_COOKIE_PATH = '/api/education/google-classroom';
export const DEFAULT_RETURN_TO = '/en/teacher/reports';

export interface GcOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** null = misconfigured; callers log it and return 500 (never a silent no-op). */
export function getOAuthConfig(): GcOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLASSROOM_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLASSROOM_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_CLASSROOM_REDIRECT_URI?.trim();
  const secret = process.env.GC_TOKEN_COOKIE_SECRET?.trim();
  if (!clientId || !clientSecret || !redirectUri || !secret || secret.length < 32) return null;
  return { clientId, clientSecret, redirectUri };
}

export function randomUrlToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function buildGoogleAuthUrl(
  cfg: GcOAuthConfig,
  opts: { state: string; codeChallenge: string; loginHint?: string | null },
): string {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  const p = url.searchParams;
  p.set('client_id', cfg.clientId);
  p.set('redirect_uri', cfg.redirectUri);
  p.set('response_type', 'code');
  p.set('scope', GC_GRADE_PASSBACK_SCOPES.join(' '));
  p.set('include_granted_scopes', 'true');
  p.set('access_type', 'online');
  p.set('state', opts.state);
  p.set('code_challenge', opts.codeChallenge);
  p.set('code_challenge_method', 'S256');
  p.set('prompt', 'consent');
  if (opts.loginHint) p.set('login_hint', opts.loginHint);
  return url.toString();
}

/** Relative same-origin path only; anything else falls back to the reports page. */
export function safeReturnTo(raw: string | null | undefined): string {
  if (!raw || typeof raw !== 'string') return DEFAULT_RETURN_TO;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return DEFAULT_RETURN_TO;
  return raw.slice(0, 300);
}

function cookieKey(): Uint8Array {
  const secret = process.env.GC_TOKEN_COOKIE_SECRET?.trim() || '';
  return new Uint8Array(createHash('sha256').update(secret).digest());
}

export async function sealCookie(payload: Record<string, unknown>, ttlSeconds: number): Promise<string> {
  return new EncryptJWT(payload)
    .setProtectedHeader({ alg: 'dir', enc: 'A256GCM' })
    .setIssuedAt()
    .setExpirationTime(`${Math.max(1, Math.floor(ttlSeconds))}s`)
    .encrypt(cookieKey());
}

export async function unsealCookie(value: string | undefined | null): Promise<Record<string, unknown> | null> {
  if (!value) return null;
  try {
    const { payload } = await jwtDecrypt(value, cookieKey());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface GcTokenResult {
  accessToken: string;
  expiresIn: number;
  scopes: string[];
}

export async function exchangeCodeForToken(cfg: GcOAuthConfig, code: string, verifier: string): Promise<GcTokenResult> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      redirect_uri: cfg.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
    cache: 'no-store',
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${text.slice(0, 200)}`);
  const body = JSON.parse(text) as { access_token?: string; expires_in?: number; scope?: string };
  if (!body.access_token) throw new Error('Google token exchange returned no access_token');
  return {
    accessToken: body.access_token,
    expiresIn: typeof body.expires_in === 'number' ? body.expires_in : 3600,
    scopes: (body.scope || '').split(/\s+/).filter(Boolean),
  };
}
