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
