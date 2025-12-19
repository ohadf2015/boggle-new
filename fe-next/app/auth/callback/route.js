import { NextResponse } from 'next/server';
import { locales, defaultLocale } from '@/lib/i18n';

// Helper to detect user's preferred locale from request
function getPreferredLocale(request) {
  // First, check for locale cookie (set by the app when user changes language)
  // The app uses 'boggle_language' cookie for language preference
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
function getOrigin(request) {
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

// This route handles OAuth callback by redirecting to the client-side page
// which properly exchanges the code and establishes the session client-side
export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/';
  const errorParam = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  // Priority 1: Use locale from query param (passed from OAuth redirect)
  // This preserves the user's locale from before they started the OAuth flow
  const localeParam = requestUrl.searchParams.get('locale');

  // Detect the user's preferred locale (fallback if not in query param)
  let locale;
  if (localeParam && locales.includes(localeParam)) {
    locale = localeParam;
  } else {
    locale = getPreferredLocale(request);
  }

  // Get the correct origin (handles proxy scenarios)
  const origin = getOrigin(request);

  // Handle OAuth errors from provider
  if (errorParam) {
    const errorUrl = new URL(`/${locale}`, origin);
    errorUrl.searchParams.set('auth_error', 'true');
    if (errorDescription) {
      errorUrl.searchParams.set('error_message', errorDescription);
    }
    return NextResponse.redirect(errorUrl);
  }

  if (code) {
    // Redirect to client-side callback page which will handle the code exchange
    // This ensures the session is properly stored in browser storage
    const clientCallbackUrl = new URL(`/${locale}/auth/callback`, origin);
    clientCallbackUrl.searchParams.set('code', code);
    if (next && next !== '/') {
      clientCallbackUrl.searchParams.set('next', next);
    }
    return NextResponse.redirect(clientCallbackUrl);
  }

  // No code provided - redirect to home with locale
  return NextResponse.redirect(new URL(`/${locale}`, origin));
}
