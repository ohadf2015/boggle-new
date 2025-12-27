/**
 * Locale Redirect Handler
 * Handles automatic locale detection and redirection for the root path
 */

import type { Request, Response } from 'express';
import type { UrlWithParsedQuery } from 'url';

/**
 * Extended Request with geo data
 */
export interface GeoRequest extends Request {
  geoData?: {
    countryCode?: string;
  };
  headers: Request['headers'];
  url: string;
}

// Country-to-locale mapping
export const COUNTRY_TO_LOCALE: Record<string, string> = {
  IL: 'he', US: 'en', GB: 'en', CA: 'en', AU: 'en', NZ: 'en',
  IE: 'en', ZA: 'en', IN: 'en', PH: 'en', SG: 'en',
  SE: 'sv', FI: 'sv', JP: 'ja',
  // Spanish-speaking countries
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es',
  HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es',
  UY: 'es', PR: 'es', GQ: 'es'
};

export const SUPPORTED_LOCALES: string[] = ['he', 'en', 'sv', 'ja', 'es'];
export const DEFAULT_LOCALE: string = 'he';

// Social media crawler user agents
const SOCIAL_CRAWLERS: string[] = [
  'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot',
  'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
  'pinterest', 'redditbot', 'embedly', 'quora link preview',
  'outbrain', 'vkshare', 'w3c_validator'
];

/**
 * Detect if request is from a social media crawler
 * @param userAgent - User agent string
 * @returns Whether the request is from a crawler
 */
export function isSocialCrawler(userAgent: string): boolean {
  const ua = (userAgent || '').toLowerCase();
  return SOCIAL_CRAWLERS.some(bot => ua.includes(bot));
}

/**
 * Determine locale from request
 * Priority: cookie > IP geolocation > x-country-code header > Accept-Language
 * @param req - Express request object
 * @returns Locale code
 */
export function determineLocale(req: GeoRequest): string {
  // Priority 1: Cookie preference
  const cookies = req.headers.cookie;
  const cookieLocale = cookies?.split(';')
    .find(c => c.trim().startsWith('boggle_language='))
    ?.split('=')[1];

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Priority 2: IP Geolocation
  if (req.geoData?.countryCode && COUNTRY_TO_LOCALE[req.geoData.countryCode]) {
    return COUNTRY_TO_LOCALE[req.geoData.countryCode];
  }

  // Priority 3: x-country-code header
  const countryHeader = req.headers['x-country-code'] as string | undefined;
  if (countryHeader && COUNTRY_TO_LOCALE[countryHeader]) {
    return COUNTRY_TO_LOCALE[countryHeader];
  }

  // Priority 4: Accept-Language header
  const acceptLanguage = req.headers['accept-language'];
  if (acceptLanguage) {
    const browserLang = acceptLanguage.split(',')[0].split('-')[0].toLowerCase();
    if (SUPPORTED_LOCALES.includes(browserLang)) {
      return browserLang;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Handle locale redirect for root path requests
 * @param req - Express request object
 * @param res - Express response object
 * @param parsedUrl - Parsed URL object
 * @returns True if request was handled (redirected), false to continue
 */
export function handleLocaleRedirect(req: GeoRequest, res: Response, parsedUrl: UrlWithParsedQuery): boolean {
  const userAgent = (req.headers['user-agent'] as string) || '';
  const locale = determineLocale(req);
  const queryString = parsedUrl.search || '';

  // For social crawlers: rewrite internally (don't redirect)
  if (isSocialCrawler(userAgent)) {
    console.log(`[Crawler] Social crawler detected -> rewriting to /${locale}${queryString}`);
    parsedUrl.pathname = `/${locale}`;
    req.url = `/${locale}${queryString}`;
    return false; // Continue to Next.js handler
  }

  // For regular users: redirect
  console.log(`[Redirect] Root path redirect: ${req.url} -> /${locale}${queryString}`);
  res.writeHead(307, { Location: `/${locale}${queryString}` });
  res.end();
  return true; // Request handled
}
