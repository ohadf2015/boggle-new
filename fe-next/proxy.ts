import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const VALID_LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const DEFAULT_LOCALE = 'en';

// SEO and social bot user-agent fragments (lowercase)
const BOT_SIGNATURES = [
  // SEO crawlers
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'baiduspider',
  'sogou', 'exabot', 'ia_archiver', 'applebot', 'petalbot',
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'rogerbot',
  'google-inspectiontool', 'google-extended', 'bytespider',
  'gptbot', 'claudebot', 'anthropic-ai', 'ccbot',
  // Social crawlers
  'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot',
  'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
  'pinterest', 'redditbot',
];

function isBotRequest(request: NextRequest): boolean {
  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  return BOT_SIGNATURES.some(sig => ua.includes(sig));
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

  const isBot = isBotRequest(request);

  // Routes that need Supabase session refresh (game pages, API, auth)
  // Public routes (landing, SEO, static pages) skip auth for faster navigation
  const AUTH_ROUTES = [
    '/api', '/multiplayer', '/singleplayer', '/adventure', '/daily',
    '/challenge', '/join', '/brain', '/custom', '/party-screen',
    '/teacher', '/student', '/auth', '/settings', '/profile',
  ];
  const pathWithoutLocale = pathname.replace(/^\/(en|he|sv|ja|es)/, '');
  const needsAuth = AUTH_ROUTES.some(route => pathWithoutLocale.startsWith(route));

  // Create Supabase client for session refresh (skip for bots and public pages)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({
    request,
  });

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
          response = NextResponse.next({
            request,
          });
          // 3. Set cookies on the response so the browser persists the
          //    new tokens for subsequent requests.
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      // IMPORTANT: Use getUser() not getSession(). getSession() only reads
      // the local JWT without validating it server-side. getUser() contacts
      // the Supabase auth server and refreshes the token if needed.
      // Without this, tokens expire after ~1h and all API calls get 401.
      await supabase.auth.getUser();
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
    const locale = getLocaleFromRequest(request) || DEFAULT_LOCALE;
    const targetPath = pathname === '/' ? `/${locale}${search}` : `/${locale}${pathname}${search}`;

    // Bots: internal rewrite (no redirect = saves crawl budget)
    if (isBot) {
      return NextResponse.rewrite(new URL(targetPath, request.url));
    }

    // Users: 301 permanent redirect (locale structure is permanent)
    return NextResponse.redirect(new URL(targetPath, request.url), 301);
  }

  // Add security headers
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');

  return response;
}

/**
 * Extract locale from request
 * Checks Accept-Language header, cookie, or defaults to 'en'
 */
function getLocaleFromRequest(request: NextRequest): string | null {
  // Check cookie first (user preference) - LanguageContext sets 'boggle_language'
  const localeCookie = request.cookies.get('boggle_language');
  if (localeCookie && VALID_LOCALES.includes(localeCookie.value as typeof VALID_LOCALES[number])) {
    return localeCookie.value;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const preferredLocale = parseAcceptLanguage(acceptLanguage);
    if (preferredLocale) {
      return preferredLocale;
    }
  }

  return null;
}

/**
 * Parse Accept-Language header and return matching locale
 */
function parseAcceptLanguage(acceptLanguage: string): string | null {
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [locale, q = 'q=1'] = lang.trim().split(';');
      const quality = parseFloat(q.replace('q=', ''));
      return { locale: locale.toLowerCase().split('-')[0], quality };
    })
    .sort((a, b) => b.quality - a.quality);

  for (const { locale } of languages) {
    if (VALID_LOCALES.includes(locale as typeof VALID_LOCALES[number])) {
      return locale;
    }
  }

  return null;
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
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav)).*)',
  ],
};

