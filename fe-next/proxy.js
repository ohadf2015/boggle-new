import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { locales, defaultLocale, countryToLocale } from './lib/i18n';

// Create Supabase client for auth token refresh
function createSupabaseClient(request) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  return { supabase, supabaseResponse: () => supabaseResponse };
}

// Get locale from Accept-Language header
function getLocaleFromAcceptLanguage(acceptLanguage) {
  if (!acceptLanguage) return null;

  // Parse Accept-Language header (e.g., "en-US,en;q=0.9,he;q=0.8")
  const languages = acceptLanguage
    .split(',')
    .map(lang => {
      const [code, qValue] = lang.trim().split(';q=');
      return {
        code: code.split('-')[0].toLowerCase(),
        quality: qValue ? parseFloat(qValue) : 1.0
      };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the first supported locale
  for (const lang of languages) {
    if (locales.includes(lang.code)) {
      return lang.code;
    }
  }

  return null;
}

// Get locale from geo headers (Vercel, Cloudflare, etc.)
function getLocaleFromGeo(request) {
  // Vercel provides x-vercel-ip-country
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  if (vercelCountry && countryToLocale[vercelCountry]) {
    return countryToLocale[vercelCountry];
  }

  // Cloudflare provides cf-ipcountry
  const cfCountry = request.headers.get('cf-ipcountry');
  if (cfCountry && countryToLocale[cfCountry]) {
    return countryToLocale[cfCountry];
  }

  // AWS CloudFront provides cloudfront-viewer-country
  const awsCountry = request.headers.get('cloudfront-viewer-country');
  if (awsCountry && countryToLocale[awsCountry]) {
    return countryToLocale[awsCountry];
  }

  // Generic geo header (some proxies/CDNs use this)
  const geoCountry = request.headers.get('x-country-code');
  if (geoCountry && countryToLocale[geoCountry]) {
    return countryToLocale[geoCountry];
  }

  return null;
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // Refresh Supabase auth tokens if configured
  // This must happen on every request to keep the session alive
  let supabaseResponse = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const { supabase, supabaseResponse: getSupabaseResponse } = createSupabaseClient(request);

    // IMPORTANT: Do not run code between createServerClient and supabase.auth.getUser()
    // A simple mistake could make it very hard to debug issues with users being randomly logged out
    await supabase.auth.getUser();

    supabaseResponse = getSupabaseResponse();
  }

  // Check if the pathname already has a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    // Return supabase response to preserve refreshed cookies, or continue normally
    return supabaseResponse || undefined;
  }

  // Check for user's explicit language preference cookie
  const cookieLocale = request.cookies.get('boggle_language')?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    request.nextUrl.pathname = `/${cookieLocale}${pathname === '/' ? '' : pathname}`;
    const response = NextResponse.redirect(request.nextUrl);

    // Copy supabase auth cookies to redirect response
    if (supabaseResponse) {
      supabaseResponse.cookies.getAll().forEach(cookie => {
        response.cookies.set(cookie.name, cookie.value, cookie);
      });
    }

    return response;
  }

  // Determine locale based on location (priority order):
  // 1. Geo headers (IP-based location from CDN/hosting provider)
  // 2. Accept-Language header (browser preference)
  // 3. Default locale
  const geoLocale = getLocaleFromGeo(request);
  const acceptLanguageLocale = getLocaleFromAcceptLanguage(
    request.headers.get('accept-language')
  );
  const detectedLocale = geoLocale || acceptLanguageLocale || defaultLocale;

  // Redirect to the detected locale
  request.nextUrl.pathname = `/${detectedLocale}${pathname === '/' ? '' : pathname}`;

  const response = NextResponse.redirect(request.nextUrl);

  // Set the detected locale in a cookie for subsequent requests
  response.cookies.set('boggle_detected_locale', detectedLocale, {
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  });

  // Copy supabase auth cookies to redirect response
  if (supabaseResponse) {
    supabaseResponse.cookies.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!_next|api|favicon.ico|.*\\..*).*)',
  ],
};
