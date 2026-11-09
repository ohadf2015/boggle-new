/**
 * LexiClash's real, existing public profiles, used as Organization `sameAs` for entity verification.
 * NEVER add placeholder or not-yet-created accounts: a sameAs that 404s weakens the entity.
 * Add X/Twitter, YouTube, Pinterest, etc. only the day the profile exists and is confirmed ours.
 * Never lexiclash.com.
 */
export const LEXICLASH_SAME_AS: readonly string[] = [
  'https://www.instagram.com/lexi.clash',
  'https://www.threads.com/@lexi.clash',
  'https://www.tiktok.com/@lexiclash',
  'https://play.google.com/store/apps/details?id=live.lexiclash.app',
];
