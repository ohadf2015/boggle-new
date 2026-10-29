/**
 * Known SEO/social/AI crawler user-agent fragments (lowercase).
 *
 * Shared between the edge proxy (rewrite/404 decisions) and server components
 * that must not emit crawler-only markup — e.g. the inline RUM beacon, whose
 * `page_cold_start` events from JS-capable bots (Googlebot et al.) each
 * arrive under a fresh random distinct_id and pollute engagement volume.
 */
export const BOT_SIGNATURES = [
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
] as const;

export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  const ua = (userAgent || '').toLowerCase();
  return BOT_SIGNATURES.some((sig) => ua.includes(sig));
}

/**
 * Headless browsers, audit tools and scripted clients (lowercase fragments).
 * These run our JS and write analytics rows like a real visitor: in Oct 2026
 * about 40% of analytics_events sessions were HeadlessChrome and the like.
 */
const AUTOMATION_SIGNATURES = [
  'headlesschrome', 'chrome-lighthouse', 'lighthouse', 'page speed insights',
  'pagespeed', 'gtmetrix', 'puppeteer', 'playwright', 'phantomjs', 'selenium',
  'python-requests', 'python-urllib', 'aiohttp', 'curl/', 'wget/', 'go-http-client',
  'node-fetch', 'axios/',
] as const;

/** True for crawlers plus headless/automation clients — for analytics hygiene. */
export function isAutomatedUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  const ua = userAgent.toLowerCase();
  return isBotUserAgent(ua) || AUTOMATION_SIGNATURES.some((sig) => ua.includes(sig));
}
