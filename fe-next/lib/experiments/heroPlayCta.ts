/**
 * Growth Radar experiment `lexiclash-hero-play-cta` (visit → first game played).
 *
 * Only new visitors on the homepage are asked for the flag (PageClient passes
 * `onPlay` to the hero only for them), because getFlag logs the exposure and
 * returning players already have a first game. Null or `control` keeps today's
 * primary "Play with friends" button; `treatment` turns that same button, in
 * place, into a solo "Play now" (free, no sign-up) that opens the coached first
 * round. The mode keycaps and the rest of the page are unchanged.
 */
export const HERO_PLAY_CTA_KEY = 'lexiclash-hero-play-cta';
export const HERO_PLAY_CTA_TREATMENT = 'treatment';

export function heroPrimaryIsSolo(variant: string | null): boolean {
  return variant === HERO_PLAY_CTA_TREATMENT;
}

/**
 * Landing pages where new visitors arrive besides the homepage (Growth Radar entry
 * points, 30 days to 2026-11-23): SEO pages whose own CTA leads into a game. Locale-
 * agnostic slugs. Education/teacher pages are deliberately not here.
 */
export const HERO_PLAY_CTA_ENTRY_SLUGS: Readonly<Record<string, 'firstGame' | 'dailyWheel'>> = {
  'online-word-games-with-friends': 'firstGame',
  'play-boggle-online-free': 'firstGame',
  'juego-de-palabras-multijugador': 'firstGame',
  'swedish-multiplayer-word-game': 'firstGame',
  'scrabble-alternative-online': 'firstGame',
  // The daily wheel's landing page: its play-now goes to today's wheel, which is what visitors came for.
  'daily-word-wheel': 'dailyWheel',
};

/** Where the entry-page "Play now" bar sends a visitor on `pathname`, or null when the page is not under test. */
export function entryPlayNowHref(pathname: string | null | undefined, lang: string): string | null {
  const m = /^\/([a-z]{2})\/([^/?#]+)\/?$/.exec(pathname ?? '');
  if (!m) return null;
  const kind = HERO_PLAY_CTA_ENTRY_SLUGS[m[2]];
  if (!kind) return null;
  return kind === 'dailyWheel' ? `/${lang}/daily/word-wheel` : `/${lang}/quick-play?mode=classic&coach=1`;
}
