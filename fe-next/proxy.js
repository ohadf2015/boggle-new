import { NextResponse } from 'next/server';
import { locales, defaultLocale } from './lib/i18n';

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Check if the pathname is missing a locale
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  // Detect locale from Accept-Language header
  const acceptLanguage = request.headers.get('accept-language');
  let locale = defaultLocale;

  if (acceptLanguage) {
    const browserLang = acceptLanguage.split(',')[0].split('-')[0];
    if (locales.includes(browserLang)) {
      locale = browserLang;
    }
  }

  // Redirect to the locale-specific path
  // For root path, redirect to default locale
  if (pathname === '/') {
    request.nextUrl.pathname = `/${defaultLocale}`;
  } else {
    request.nextUrl.pathname = `/${locale}${pathname}`;
  }

  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Skip all internal paths (_next, api, static files)
    '/((?!_next|api|favicon.ico|.*\\..*).*)',
  ],
};
