import { NextResponse, type NextRequest } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n';

// Force dynamic rendering - don't cache this redirect
export const dynamic = 'force-dynamic';

/**
 * Root route handler - redirects to the appropriate locale
 * This handles the case when users navigate to "/" without a locale prefix
 */

// Helper to detect user's preferred locale from request
function getPreferredLocale(request: NextRequest): string {
  // Highest: explicit ?locale= query (matches documented usage for ?locale=he RTL/testing + deep links)
  const qLocale = request.nextUrl.searchParams.get('locale');
  if (qLocale && locales.includes(qLocale)) {
    return qLocale;
  }

  // First, check for locale cookie (set by the app when user changes language)
  const localeCookie = request.cookies.get('boggle_language')?.value;
  if (localeCookie && locales.includes(localeCookie)) {
    return localeCookie;
  }

  // Check Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    // Parse the header and find a matching locale
    const preferredLanguages = acceptLanguage
      .split(',')
      .map(lang => lang.split(';')[0].trim().toLowerCase())
      .map(lang => lang.split('-')[0]); // Get just the language code (e.g., 'en' from 'en-US')

    for (const lang of preferredLanguages) {
      if (locales.includes(lang)) {
        return lang;
      }
    }
  }

  return defaultLocale;
}

// Helper to get the correct origin when behind a proxy
function getOrigin(request: NextRequest): string {
  // Check for forwarded headers (set by proxies/load balancers)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';

  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  // Check for host header
  const host = request.headers.get('host');
  if (host) {
    // Determine protocol - assume https in production
    const proto = host.includes('localhost') ? 'http' : 'https';
    return `${proto}://${host}`;
  }

  // Fallback to URL origin
  const requestUrl = new URL(request.url);
  return requestUrl.origin;
}

export async function GET(request: NextRequest) {
  const locale = getPreferredLocale(request);
  const origin = getOrigin(request);

  // Preserve query parameters (like ?room=1234 for invite links)
  const requestUrl = new URL(request.url);
  const searchParams = requestUrl.search;
  const roomCode = requestUrl.searchParams.get('room');

  // If there's a room code in the URL, redirect directly to multiplayer page
  // This provides a faster, more direct path to the quick join screen
  if (roomCode) {
    const targetUrl = new URL(`/${locale}/multiplayer${searchParams}`, origin);
    return NextResponse.redirect(targetUrl);
  }

  const targetUrl = new URL(`/${locale}${searchParams}`, origin);

  return NextResponse.redirect(targetUrl);
}
