/**
 * Detects JS-rendering search-engine crawlers (Googlebot WRS, Bingbot) by UA token.
 *
 * WHY client-side UA sniffing (not a server branch): the locale homepage and the
 * deep play routes are statically generated (SSG/ISR) — the server response is
 * cached and byte-identical for every requester behind the CDN, so a server-side
 * UA branch cannot fork content. The crawler signal must be read at render time on
 * the client, which is exactly where the onboarding/style interstitials decide to
 * open.
 *
 * WHY this is NOT cloaking: we use this ONLY to skip a client-side interstitial so
 * the crawler indexes the SAME content real users reach — the LandingView (every
 * returning user, and every user post-onboarding) and the deep-route page itself.
 * We never synthesize bot-only content. Skipping an interstitial for bots also
 * aligns with Google's own ranking preference against intrusive interstitials.
 *
 * WHY a UA token and not `navigator.webdriver`: Googlebot's Web Rendering Service
 * does NOT set `navigator.webdriver`, so gating on it would miss the real target.
 * The reliable signal is the `Googlebot`/`bingbot` token, which the WRS keeps in
 * `navigator.userAgent` even while it runs our JS.
 *
 * SCOPE: only the JS-rendering engines matter here. Raw-HTML fetchers (GPTBot,
 * ClaudeBot, PerplexityBot, …) never execute this code — they already receive the
 * server-rendered content — so they are intentionally absent from the pattern.
 */
const CRAWLER_UA =
  /googlebot|google-inspectiontool|adsbot-google|storebot-google|bingbot|bingpreview|mediapartners-google/i;

/** Pure predicate over a user-agent string. Exported for unit tests. */
export function isCrawlerUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return CRAWLER_UA.test(ua);
}

/** True when the current client is a JS-rendering crawler. SSR-safe (false). */
export function isCrawler(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isCrawlerUserAgent(navigator.userAgent);
}
