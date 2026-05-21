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

/** Neo-brutalist altitude palette: ground → galaxy. */
export const BIOME_THEME: Record<WordTowerBiomeId, BiomeTheme> = {
  city: { bg: 'linear-gradient(180deg,#1a1a2e 0%,#2a3a5e 60%,#3a5a7e 100%)', block: 0xbfff00, accent: 0x1a1a2e, stars: 0 },
  sky: { bg: 'linear-gradient(180deg,#0e2a4e 0%,#1f6fae 55%,#5fc9ff 100%)', block: 0x00ffff, accent: 0x0e2a4e, stars: 0.1 },
  stratosphere: { bg: 'linear-gradient(180deg,#1a0e3e 0%,#5b3fae 55%,#9b7fff 100%)', block: 0x8b5cf6, accent: 0xfffef0, stars: 0.35 },
  orbit: { bg: 'linear-gradient(180deg,#05060f 0%,#0e1430 60%,#1a2350 100%)', block: 0x00ffff, accent: 0xfffef0, stars: 0.7 },
  nebula: { bg: 'linear-gradient(180deg,#1a0220 0%,#5e1060 55%,#ff1493 100%)', block: 0xff1493, accent: 0xfffef0, stars: 0.85 },
  galaxy: { bg: 'linear-gradient(180deg,#04030a 0%,#2a0a4e 45%,#7a1fae 80%,#ffe135 100%)', block: 0xffe135, accent: 0x04030a, stars: 1 },
};
