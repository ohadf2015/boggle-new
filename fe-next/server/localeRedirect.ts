/**
 * Locale Redirect Handler
 * Handles automatic locale detection and redirection for the root path
 */

import type { Request, Response } from 'express';
import type { UrlWithParsedQuery } from 'url';
import { httpLogger } from './logger';
import { resolveLocaleFromAcceptLanguage } from '../lib/localeResolution';

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
  // Russian-speaking countries
  RU: 'ru', BY: 'ru', KZ: 'ru', KG: 'ru',
  // Spanish-speaking countries
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es',
  VE: 'es', EC: 'es', GT: 'es', CU: 'es', BO: 'es', DO: 'es',
  HN: 'es', PY: 'es', SV: 'es', NI: 'es', CR: 'es', PA: 'es',
  UY: 'es', PR: 'es', GQ: 'es'
};

export const SUPPORTED_LOCALES: string[] = ['he', 'en', 'sv', 'ja', 'es', 'ru'];
export const DEFAULT_LOCALE: string = 'en';

// Social media crawler user agents
const SOCIAL_CRAWLERS: string[] = [
  'whatsapp', 'facebookexternalhit', 'facebot', 'twitterbot',
  'linkedinbot', 'slackbot', 'telegrambot', 'discordbot',
  'pinterest', 'redditbot', 'embedly', 'quora link preview',
  'outbrain', 'vkshare', 'w3c_validator'
];

// SEO search engine crawler user agents
const SEO_CRAWLERS: string[] = [
  'googlebot', 'bingbot', 'yandexbot', 'duckduckbot', 'baiduspider',
  'sogou', 'exabot', 'ia_archiver', 'applebot', 'petalbot',
  'semrushbot', 'ahrefsbot', 'mj12bot', 'dotbot', 'rogerbot',
  'google-inspectiontool', 'google-extended', 'bytespider',
  'gptbot', 'claudebot', 'anthropic-ai', 'ccbot'
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
 * Detect if request is from an SEO search engine crawler
 * @param userAgent - User agent string
 * @returns Whether the request is from an SEO bot
 */
export function isSeoCrawler(userAgent: string): boolean {
  const ua = (userAgent || '').toLowerCase();
  return SEO_CRAWLERS.some(bot => ua.includes(bot));
}

/**
 * Detect a non-browser HTTP client (empty UA, or a UA lacking the "Mozilla"
 * token every real browser sends). Covers curl/python/go-http and other
 * server-side GETs that fetch the root and do NOT follow the locale 301 — so
 * they must be served the rendered page (200) instead of a redirect.
 * @param userAgent - User agent string
 */
export function isNonBrowserClient(userAgent: string): boolean {
  const ua = (userAgent || '').trim();
  if (!ua) return true;
  return !/mozilla/i.test(ua);
}

/**
 * Detect if request is from any type of bot (social or SEO)
 */
export function isBot(userAgent: string): boolean {
  return isSocialCrawler(userAgent) || isSeoCrawler(userAgent);
}

/**
 * Determine locale from request
 * Priority: cookie > Accept-Language > default
 * Location-based detection removed to respect user preferences
 * @param req - Express request object
 * @returns Locale code
 */
export function determineLocale(req: GeoRequest): string {
  // Priority 1: Cookie preference (explicit user selection)
  const cookies = req.headers.cookie;
  const cookieLocale = cookies?.split(';')
    .find(c => c.trim().startsWith('boggle_language='))
    ?.split('=')[1];

  if (cookieLocale && SUPPORTED_LOCALES.includes(cookieLocale)) {
    return cookieLocale;
  }

  // Priority 2: Accept-Language header (browser preference). Shared resolver
  // q-sorts the full list AND maps close-but-unshipped languages to a native
  // bundle (e.g. pt-BR -> es) before falling back to DEFAULT_LOCALE. Previously
  // this only inspected the first tag and ignored proximity, so Brazilians got
  // English instead of our (far more intelligible) Spanish bundle.
  return resolveLocaleFromAcceptLanguage(
    req.headers['accept-language'],
    DEFAULT_LOCALE,
  );
}

/**
 * Handle locale redirect for root path requests
 * @param req - Express request object
 * @param res - Express response object
 * @param parsedUrl - Parsed URL object
 * @returns True if request was handled (redirected), false to continue
 */
export function handleLocaleRedirect(req: GeoRequest, _res: Response, parsedUrl: UrlWithParsedQuery): boolean {
  const userAgent = (req.headers['user-agent'] as string) || '';
  const locale = determineLocale(req);
  const queryString = parsedUrl.search || '';

  // A real browser TOP-LEVEL navigation always sends `Sec-Fetch-Mode: navigate`
  // (Chrome 76+/Firefox 90+/Safari 16.4+). Server-side fetches cannot forge it.
  const secFetchMode = (req.headers['sec-fetch-mode'] as string) || '';
  const isBrowserNavigation = secFetchMode === 'navigate';

  // ALWAYS rewrite the bare root internally (200 localized content), NEVER 301.
  // Why no redirect: some server-side clients fetch the root and do NOT follow
  // redirects, and their request shape (UA / headers) is not reliably
  // detectable, so we stop trying to single them out and just serve everyone.
  // SEO is unaffected: SEO crawlers ALREADY received /en content here (this
  // handler never issued them a redirect), and every locale page carries an
  // absolute canonical, so removing the human 301 changes nothing Googlebot sees.
  //
  // x-default 'en' for SEO crawlers + non-browser/non-navigation clients (match
  // the sitemap canonical); a genuine human browser navigation gets its detected
  // locale so it still lands on localized content at the root.
  const servesXDefault =
    isSeoCrawler(userAgent) || isNonBrowserClient(userAgent) || !isBrowserNavigation;
  const targetLocale = servesXDefault ? 'en' : locale;

  httpLogger.debug({ targetLocale, servesXDefault, queryString }, 'Root rewrite (no redirect)');
  parsedUrl.pathname = `/${targetLocale}`;
  req.url = `/${targetLocale}${queryString}`;
  return false; // Continue to Next.js handler — serves 200 localized content
}
