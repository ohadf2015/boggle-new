import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

export interface BiomeTheme {
  /** CSS background (gradient) for the sky behind the tower. */
  bg: string;
  /** Hard-shadow block fill for floors in this biome (hex int for Pixi). */
  block: number;
  /** Accent / text color (hex int for Pixi). */
  accent: number;
  /** Star/particle layer opacity 0..1 (space biomes glow). */
  stars: number;
}

/**
 * Altitude palette: a continuous climb from a BRIGHT daytime city ground up
 * through dusk and into deep space. Starting bright (not the old near-black
 * navy) gives the scene real depth + a Tower-Bloxx airiness; the sky darkens
 * and the stars come out as you ascend, reinforcing the journey.
 */
export const BIOME_THEME: Record<WordTowerBiomeId, BiomeTheme> = {
  city: { bg: 'linear-gradient(180deg,#2E6FB7 0%,#5AA0E0 42%,#9CCDF2 78%,#D6EEFF 100%)', block: 0xbfff00, accent: 0x14202e, stars: 0 },
  sky: { bg: 'linear-gradient(180deg,#16407e 0%,#2f78c4 48%,#73bdf0 100%)', block: 0x00ffff, accent: 0x0e2a4e, stars: 0.06 },
  stratosphere: { bg: 'linear-gradient(180deg,#211848 0%,#5b3a9e 42%,#b85a93 74%,#f2a65a 100%)', block: 0x8b5cf6, accent: 0xfffef0, stars: 0.32 },
  orbit: { bg: 'linear-gradient(180deg,#04060f 0%,#0b1230 58%,#16204a 100%)', block: 0x00ffff, accent: 0xfffef0, stars: 0.7 },
  nebula: { bg: 'linear-gradient(180deg,#180322 0%,#5a1063 50%,#b81e8c 84%,#ff4fa3 100%)', block: 0xff1493, accent: 0xfffef0, stars: 0.85 },
  galaxy: { bg: 'linear-gradient(180deg,#04030a 0%,#2a0a4e 45%,#7a1fae 80%,#ffd23f 100%)', block: 0xffe135, accent: 0x04030a, stars: 1 },
};
