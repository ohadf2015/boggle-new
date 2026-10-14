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
