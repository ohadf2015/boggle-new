import { legacyClassroomLiveRedirect, legacyHostLiveRedirect } from './lib/education/classroomLivePath';
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { countryFromHeaders, mergeVary, resolveRequestLocale } from './lib/localeResolution';
import { isHiddenQaRoute } from './lib/qaRoutes';
import { decideNextHandle } from './lib/seo/nextHandleGate';
// Shared with the [locale] layout (RUM beacon suppression for crawlers).
import { isBotUserAgent } from './lib/seo/botUa';
import { ROOT_SERVED_HEADER } from './lib/seo/hreflang';
import { isNativeAppUserAgent, nativeHandoffRoute } from './lib/native/nativeHandoff';
import { needsSessionRefresh } from './lib/navigation/sessionRefreshRoutes';

const VALID_LOCALES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
const DEFAULT_LOCALE = 'en';

// Bot probes for secrets / admin panels. Short-circuit with 404 before
// App Router renders `/[locale]` — renders crashed with
// `controller[kState].transformAlgorithm is not a function` on Node 22
// (Sentry JAVASCRIPT-NEXTJS-NE).
const PROBE_RE = /^\/(?:\.(?:env|git|aws|ssh|DS_Store)|wp-admin|wp-login|wp-includes|wp-content|phpmyadmin|phpinfo|xmlrpc\.php|config\.json|credentials|secrets\.json|backup\.zip|admin\.php|\.well-known\/security\.txt)/i;

// SEO and social bot user-agent fragments live in lib/seo/botUa.ts.
function isBotRequest(request: NextRequest): boolean {
  return isBotUserAgent(request.headers.get('user-agent'));
}

/**
 * Next.js Proxy (formerly Middleware)
 * Handles:
 * - SEO bot detection (rewrite instead of redirect to preserve crawl budget)
 * - Supabase auth session refresh
 * - Locale detection and redirection
 * - Security headers
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (PROBE_RE.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // Unknown slugs must not be rewritten into /{locale}/… (that SSRs the
  // 718-line locale layout per scanner URL — idle old-space leak, t_f5eb034e).
  const gate = decideNextHandle(pathname, request.headers.get('user-agent'));
  if (gate.action === 'drop') {
    return new NextResponse(null, { status: 404 });
  }
  if (gate.action === 'redirect') {
    return NextResponse.redirect(new URL(`${gate.location}${search}`, request.url), 308);
  }

  // A page-level notFound() streams under [locale]/loading.tsx and answers 200.
  if (isHiddenQaRoute(pathname)) {
    const locale = pathname.split('/')[1];
    return NextResponse.rewrite(new URL(`/${locale}/__qa-route-disabled`, request.url));
  }

  if (isNativeAppUserAgent(request.headers.get('user-agent'))) {
    const handoff = nativeHandoffRoute(pathname, getLocaleFromRequest(request) ?? 'en');
    if (handoff) return NextResponse.rewrite(new URL(handoff, request.url));
  }

  const pathnameHasLocale = VALID_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Skip proxy entirely for static files and Next.js internals
  // NOTE: API routes are NOT skipped — they need Supabase session refresh
  // to prevent silent 401s after ~1h of play (PKCE token expiry).
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap')
  ) {
    return NextResponse.next();
  }

  const adminInOtherLocale = pathname.match(/^\/(?:en|es|sv|ja|ru)(\/admin(?:\/.*)?)$/);
  if (adminInOtherLocale) {
    return NextResponse.redirect(new URL(`/he${adminInOtherLocale[1]}${search}`, request.url), 307);
  }

  const classroomLive = pathnameHasLocale
    ? legacyClassroomLiveRedirect(pathname, request.nextUrl.search) ?? legacyHostLiveRedirect(pathname, request.nextUrl.search)
    : null;
  if (classroomLive) {
    return NextResponse.redirect(new URL(classroomLive, request.url), 307);
  }

  const isBot = isBotRequest(request);

  const pathWithoutLocale = pathname.replace(/^\/(en|he|sv|ja|es|ru)/, '');
  const needsAuth = needsSessionRefresh(pathname);

  // Create Supabase client for session refresh (skip for bots and public pages)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = continueRequest(request);

  if (needsAuth && !isBot && supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // 1. Update cookies on the request so downstream route handlers
          //    see the refreshed tokens via `cookies()`.
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // 2. Recreate the response with the updated request — this is
          //    critical because the original response captured the old
          //    headers before the token refresh.
          response = continueRequest(request);
          // 3. Set cookies on the response so the browser persists the
          //    new tokens for subsequent requests.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      // Use getSession() for proxy — it reads the JWT locally and triggers
      // automatic PKCE token refresh when the access token is expired.
      // getUser() was making a network round-trip to Supabase Auth on EVERY
      // page navigation (200-500ms+, up to 30s when Supabase is slow).
      // getSession() achieves the same refresh behavior without the latency.
      await supabase.auth.getSession();
    } catch {
      // Silently handle auth errors in proxy
    }
  }

  // API routes: allow through after auth refresh — never locale-redirect
  // Also handle locale-prefixed API calls (e.g., /he/api/...) by rewriting
  // to strip the locale prefix — prevents 404s from relative URL resolution.
  if (pathname.startsWith('/api')) {
    return response;
  }
  if (pathWithoutLocale.startsWith('/api') && pathnameHasLocale) {
    const apiUrl = new URL(`${pathWithoutLocale}${search}`, request.url);
    return NextResponse.rewrite(apiUrl, { request, headers: response.headers });
  }

  // Handle paths without locale prefix
  if (!pathnameHasLocale) {
    // Perf (r6 / #1177 follow-up): bare /singleplayer must stay an internal
    // rewrite to /en/singleplayer — never a locale 301. next.config excludes
    // this path from the catch-all redirect and has a beforeFiles rewrite, but
    // after that exclusion the proxy still runs first and was 301'ing users
    // (prod after #1177: Location /en/singleplayer, 16-byte body). Match the
    // beforeFiles destination (/en/...) so FCP/LCP stay hop-free.
    if (pathname === '/singleplayer' || pathname.startsWith('/singleplayer/')) {
      // Hop-free rewrite (keeps FCP off a redirect), but negotiate the locale
      // instead of hard-coding /en. Bots get the English x-default bundle.
      const locale = isBot ? DEFAULT_LOCALE : getLocaleFromRequest(request);
      const rewriteUrl = new URL(`/${locale}${pathname}${search}`, request.url);
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-lc-pathname', pathname);
      const rewriteResponse = NextResponse.rewrite(rewriteUrl, {
        request: { headers: requestHeaders },
      });
      // Carry Set-Cookie from the auth session refresh above (if any).
      response.cookies.getAll().forEach((cookie) => {
        rewriteResponse.cookies.set(cookie.name, cookie.value);
      });
      return withLocaleVary(rewriteResponse);
    }

    // Bots always get the English x-default bundle and stay on the requested
    // URL (internal rewrite). Users are temporarily redirected so the chosen
    // locale is in the address bar; 307 (not 301/308) so a later cookie or
    // Accept-Language change is not permanently cached by the browser.
    const locale = isBot ? DEFAULT_LOCALE : getLocaleFromRequest(request);
    const targetPath = pathname === '/' ? `/${locale}${search}` : `/${locale}${pathname}${search}`;

    if (isBot) {
      // The bare root rewrites to a locale bundle but keeps serving at `/`;
      // mark it so the [locale] layout self-canonicalizes `/` and names it
      // x-default (lib/seo/hreflang.ts). Any other rewrite must not carry a
      // client-sent copy of the marker into a locale page. Production strips
      // the marker one layer up (server/index.ts) before its own root rewrite.
      const requestHeaders = new Headers(request.headers);
      if (pathname === '/') requestHeaders.set(ROOT_SERVED_HEADER, locale);
      else requestHeaders.delete(ROOT_SERVED_HEADER);
      return withLocaleVary(NextResponse.rewrite(new URL(targetPath, request.url), { request: { headers: requestHeaders } }));
    }

    return withLocaleVary(NextResponse.redirect(new URL(targetPath, request.url), 307));
  }

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  // X-Frame-Options removed — using CSP frame-ancestors instead (modern approach)
  // This allows CrazyGames and other game portals to embed our game in iframes

  return response;
}

function continueRequest(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-lc-pathname', request.nextUrl.pathname);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

function withLocaleVary(response: NextResponse): NextResponse {
  response.headers.set('Vary', mergeVary(response.headers.get('Vary'), 'Accept-Language, Cookie'));
  return response;
}

/**
 * Locale for an unprefixed request.
 * Precedence: ?locale= > boggle_language / NEXT_LOCALE cookie > Accept-Language
 * > geo country (weak fallback) > default. Prefixed URLs never call this.
 */
function getLocaleFromRequest(request: NextRequest): string {
  return resolveRequestLocale({
    queryLocale: request.nextUrl.searchParams.get('locale'),
    cookieHeader: request.headers.get('cookie'),
    acceptLanguage: request.headers.get('accept-language'),
    country: countryFromHeaders((name) => request.headers.get(name)),
  }, DEFAULT_LOCALE);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!lcx|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)).*)',
  ],
};

