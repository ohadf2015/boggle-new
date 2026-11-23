/**
 * Growth Radar experiment `lexiclash-hero-play-cta` (visit → first game played).
 *
 * Only new visitors on the fresh homepage are asked for the flag (PageClient
 * passes `onPlay` to the hero only for them), because getFlag logs the
 * exposure and returning players already have a first game. Null or `control`
 * keeps today's "Play now"; `treatment` says the round is free and needs no
 * sign-up. Same button, same link, same handler: only the label changes.
 */
export const HERO_PLAY_CTA_KEY = 'lexiclash-hero-play-cta';
export const HERO_PLAY_CTA_TREATMENT = 'treatment';

export function heroPlayLabelKey(variant: string | null): 'homeFresh.hero.play' | 'homeFresh.hero.playNoSignup' {
  return variant === HERO_PLAY_CTA_TREATMENT ? 'homeFresh.hero.playNoSignup' : 'homeFresh.hero.play';
}
