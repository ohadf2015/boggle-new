import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const VALID_LOCALES = ['en', 'he', 'sv', 'ja'] as const;
const DEFAULT_LOCALE = 'en';

/**
 * Next.js Proxy (formerly Middleware)
 * Handles:
 * - Supabase auth session refresh
 * - Locale detection and redirection
 * - Security headers
 * - Request logging (dev only)
 * - Performance optimizations
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const pathnameHasLocale = VALID_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  // Skip proxy for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/manifest.json') ||
    pathname.startsWith('/robots.txt') ||
    pathname.startsWith('/sitemap')
  ) {
    return NextResponse.next();
  }

  // Create Supabase client for session refresh
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Refresh Supabase session if configured
  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      
      // Session refresh happens automatically via cookie handling above
      // This ensures tokens are refreshed on every request
    } catch (error) {
      // Silently handle auth errors in proxy - let client handle them
    }
  }

  // Handle root path - redirect to default locale
  if (pathname === '/') {
    const locale = getLocaleFromRequest(request) || DEFAULT_LOCALE;
    return NextResponse.redirect(
      new URL(`/${locale}${search}`, request.url)
    );
  }

  // If pathname doesn't have a locale, add default locale
  if (!pathnameHasLocale) {
    const locale = getLocaleFromRequest(request) || DEFAULT_LOCALE;
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}${search}`, request.url)
    );
  }

  // Add security headers
  // Security headers (complement to next.config.mjs)
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Performance headers
  response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  
  return response;
}

/**
 * Extract locale from request
 * Checks Accept-Language header, cookie, or defaults to 'en'
 */
function getLocaleFromRequest(request: NextRequest): string | null {
  // Check cookie first (user preference)
  const localeCookie = request.cookies.get('locale');
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

