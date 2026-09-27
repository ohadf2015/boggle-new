import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHash } from 'crypto';
import {
  buildGoogleAuthUrl,
  exchangeCodeForToken,
  pkceChallenge,
  randomUrlToken,
  safeReturnTo,
  sealCookie,
  unsealCookie,
  getOAuthConfig,
} from '../googleClassroomOAuth';

beforeEach(() => {
  vi.stubEnv('GOOGLE_CLASSROOM_CLIENT_ID', 'cid.apps.googleusercontent.com');
  vi.stubEnv('GOOGLE_CLASSROOM_CLIENT_SECRET', 'secret');
  vi.stubEnv('GOOGLE_CLASSROOM_REDIRECT_URI', 'https://www.lexiclash.live/api/education/google-classroom/oauth/callback');
  vi.stubEnv('GC_TOKEN_COOKIE_SECRET', 'x'.repeat(40));
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getOAuthConfig', () => {
  it('returns null when any env var is missing (caller must log + 500)', () => {
    vi.stubEnv('GOOGLE_CLASSROOM_CLIENT_SECRET', '');
    expect(getOAuthConfig()).toBeNull();
  });
  it('rejects a short cookie secret', () => {
    vi.stubEnv('GC_TOKEN_COOKIE_SECRET', 'short');
    expect(getOAuthConfig()).toBeNull();
  });
});

describe('PKCE', () => {
  it('challenge = base64url(sha256(verifier))', () => {
    const v = randomUrlToken();
    expect(v).toMatch(/^[A-Za-z0-9_-]{43,}$/);
    expect(pkceChallenge(v)).toBe(createHash('sha256').update(v).digest('base64url'));
  });
});

describe('buildGoogleAuthUrl', () => {
  it('asks incrementally for the grade scopes with PKCE S256 + login hint', () => {
    const url = new URL(buildGoogleAuthUrl(getOAuthConfig()!, { state: 'st', codeChallenge: 'ch', loginHint: 't@school.org' }));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    const p = url.searchParams;
    expect(p.get('client_id')).toBe('cid.apps.googleusercontent.com');
    expect(p.get('response_type')).toBe('code');
    expect(p.get('include_granted_scopes')).toBe('true');
    expect(p.get('access_type')).toBe('online');
    expect(p.get('code_challenge_method')).toBe('S256');
    expect(p.get('code_challenge')).toBe('ch');
    expect(p.get('state')).toBe('st');
    expect(p.get('login_hint')).toBe('t@school.org');
    expect(p.get('scope')).toContain('classroom.coursework.students');
    expect(p.get('scope')).toContain('classroom.profile.emails');
  });
});

describe('safeReturnTo', () => {
  it('only allows same-origin relative paths', () => {
    expect(safeReturnTo('/he/teacher/reports')).toBe('/he/teacher/reports');
    expect(safeReturnTo('//evil.com')).toBe('/en/teacher/reports');
    expect(safeReturnTo('https://evil.com')).toBe('/en/teacher/reports');
    expect(safeReturnTo('/\\evil.com')).toBe('/en/teacher/reports');
    expect(safeReturnTo(null)).toBe('/en/teacher/reports');
  });
});

describe('sealed cookies', () => {
  it('round-trips and is opaque', async () => {
    const sealed = await sealCookie({ uid: 'u1', at: 'ya29.secret' }, 600);
    expect(sealed).not.toContain('ya29');
    expect(await unsealCookie(sealed)).toMatchObject({ uid: 'u1', at: 'ya29.secret' });
  });

  it('returns null for tampered or foreign-key cookies', async () => {
    const sealed = await sealCookie({ uid: 'u1' }, 600);
    expect(await unsealCookie(sealed.slice(0, -4) + 'AAAA')).toBeNull();
    vi.stubEnv('GC_TOKEN_COOKIE_SECRET', 'y'.repeat(40));
    expect(await unsealCookie(sealed)).toBeNull();
    expect(await unsealCookie(undefined)).toBeNull();
  });
});

describe('exchangeCodeForToken', () => {
  it('posts code + verifier and returns token + granted scopes', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'ya29', expires_in: 3599, scope: 'a b' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);
    const tok = await exchangeCodeForToken(getOAuthConfig()!, 'code1', 'ver1');
    expect(tok).toEqual({ accessToken: 'ya29', expiresIn: 3599, scopes: ['a', 'b'] });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    const body = new URLSearchParams(init.body);
    expect(body.get('code')).toBe('code1');
    expect(body.get('code_verifier')).toBe('ver1');
    expect(body.get('grant_type')).toBe('authorization_code');
  });

  it('throws on a Google error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":"invalid_grant"}', { status: 400 })));
    await expect(exchangeCodeForToken(getOAuthConfig()!, 'c', 'v')).rejects.toThrow(/invalid_grant/);
  });
});
