import type { LandingArt } from '.';

const art = (name: string, width: number, height: number) => (alt: string): LandingArt => ({
  src: `/landing/kit/lp-${name}.webp`,
  alt,
  width,
  height,
});

/** Mascot hero stickers (no text in the art, so they work in every locale). Pass a localized alt. */
export const LANDING_ART = {
  friends: art('friends', 640, 568),
  solver: art('solver', 520, 640),
  wheel: art('wheel', 640, 440),
  duel: art('duel', 640, 408),
  languages: art('languages', 640, 562),
  reading: art('reading', 416, 640),
  brain: art('brain', 640, 461),
  trophy: art('trophy', 484, 640),
  blast: art('blast', 640, 604),
};
