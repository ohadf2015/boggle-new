import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

export type BiomeEvent = 'shootingStar' | 'planeFlyby' | 'helicopterPass' | 'ufoZoom' | 'meteorShower' | 'starTwinkle' | 'satelliteGlint' | 'cometStreak' | 'auroraFlare';

export interface BiomeTheme {
  /** CSS background (gradient) for the sky behind the tower. */
  bg: string;
  /** Hard-shadow block fill for floors in this biome (hex int for Pixi). */
  block: number;
  /** Accent / text color (hex int for Pixi). */
  accent: number;
  /** Star/particle layer opacity 0..1 (space biomes glow). */
  stars: number;
  /** Particle palette (hex ints) used to TINT drop/celebration bursts in this
   *  biome, so a galaxy drop spits purple/gold sparks and a city drop lime/white
   *  — instead of every biome firing the same generic confetti. */
  particles: number[];
  /** Signature glint colour for this biome (used for the brightest accent
   *  sparkles + greeble beacons). */
  glint: number;
  /** Neon accent colour greebles glow in this biome (was a single hard-coded
   *  gold for every zone — now copper-zones glow warm, nebula glows pink, etc.). */
  greebleAccent: number;
  /** Ambient shaft-wind intensity multiplier (visual, x-only crown sway). Higher
   *  zones feel more exposed. Never feeds the placement verdict. */
  windMult: number;
  /** Per-biome difficulty scalar for tower instability. DATA ONLY here — must be
   *  applied at the SHARED instability source (read by both crane target + scene)
   *  to preserve WYSIWYG; never scaled scene-side alone. */
  instabilityMult: number;
  /** Biome-native props (prop IDs to show in this biome band). If omitted,
   *  props are included by default; if empty, only generic props appear. */
  nativePropIds?: string[];
  /** Occasional random events unique to this biome (shooting stars, plane flybys, etc).
   *  Event interval in ms — ponytail: heuristic values 6s–15s chosen per biome feel. */
  eventTypes?: BiomeEvent[];
  eventIntervalMs?: number;
}

/**
 * Altitude palette: a continuous climb from a BRIGHT daytime city ground up
 * through dusk and into deep space. Starting bright (not the old near-black
 * navy) gives the scene real depth + a Tower-Bloxx airiness; the sky darkens
 * and the stars come out as you ascend, reinforcing the journey.
 *
 * Each biome also carries its own IDENTITY layer (particles/glint/greebleAccent/
 * wind/difficulty) so climbing reads as exploring distinct worlds, not one tower
 * fading through hues.
 */
export const BIOME_THEME: Record<WordTowerBiomeId, BiomeTheme> = {
  city: {
    bg: 'linear-gradient(180deg,#2E6FB7 0%,#5AA0E0 42%,#9CCDF2 78%,#D6EEFF 100%)',
    block: 0xbfff00, accent: 0x14202e, stars: 0,
    particles: [0xbfff00, 0xffffff, 0x9ccdf2], glint: 0xbfff00, greebleAccent: 0xbfff00,
    windMult: 1, instabilityMult: 1,
    nativePropIds: ['cityBird', 'birds', 'helicopter', 'plane', 'drone'],
    eventTypes: ['planeFlyby', 'helicopterPass', 'starTwinkle'],
    eventIntervalMs: 8000, // ponytail: 8s—feels active but not overwhelming in city
  },
  sky: {
    bg: 'linear-gradient(180deg,#16407e 0%,#2f78c4 48%,#73bdf0 100%)',
    block: 0x00ffff, accent: 0x0e2a4e, stars: 0.06,
    particles: [0x00ffff, 0xffffff, 0x73bdf0], glint: 0x00ffff, greebleAccent: 0x00ffff,
    windMult: 1.15, instabilityMult: 1.05,
    nativePropIds: ['skyManta', 'kite', 'balloon', 'paraglider', 'birds'],
    eventTypes: ['planeFlyby', 'helicopterPass', 'starTwinkle', 'auroraFlare'],
    eventIntervalMs: 9000, // ponytail: 9s—slower than city, more serene
  },
  stratosphere: {
    bg: 'linear-gradient(180deg,#211848 0%,#5b3a9e 42%,#b85a93 74%,#f2a65a 100%)',
    block: 0x8b5cf6, accent: 0xfffef0, stars: 0.32,
    particles: [0x8b5cf6, 0xf2a65a, 0xff9ec4], glint: 0xf2a65a, greebleAccent: 0xb98cff,
    windMult: 1.25, instabilityMult: 1.12,
    nativePropIds: ['stratSerpent', 'plane', 'rocket', 'weather balloon'],
    eventTypes: ['planeFlyby', 'auroraFlare', 'meteorShower', 'starTwinkle'],
    eventIntervalMs: 10000, // ponytail: 10s—high altitude has rare events
  },
  orbit: {
    bg: 'linear-gradient(180deg,#04060f 0%,#0b1230 58%,#16204a 100%)',
    block: 0x00ffff, accent: 0xfffef0, stars: 0.7,
    particles: [0x00ffff, 0xffffff, 0x8be9fd], glint: 0x9ae6ff, greebleAccent: 0x6fe6ff,
    windMult: 1.32, instabilityMult: 1.18,
    nativePropIds: ['orbitJelly', 'satellite', 'rocket', 'astronaut'],
    eventTypes: ['shootingStar', 'satelliteGlint', 'starTwinkle', 'cometStreak'],
    eventIntervalMs: 11000, // ponytail: 11s—space feels vast and slow
  },
  nebula: {
    bg: 'linear-gradient(180deg,#180322 0%,#5a1063 50%,#b81e8c 84%,#ff4fa3 100%)',
    block: 0xff1493, accent: 0xfffef0, stars: 0.85,
    particles: [0xff1493, 0xff4fa3, 0xb14bff], glint: 0xff4fa3, greebleAccent: 0xff79c6,
    windMult: 1.42, instabilityMult: 1.24,
    nativePropIds: ['nebulaJelly', 'comet', 'alien', 'portal'],
    eventTypes: ['shootingStar', 'cometStreak', 'auroraFlare', 'starTwinkle'],
    eventIntervalMs: 12000, // ponytail: 12s—nebula is mysterious and slow
  },
  galaxy: {
    bg: 'linear-gradient(180deg,#04030a 0%,#2a0a4e 45%,#7a1fae 80%,#ffd23f 100%)',
    block: 0xffe135, accent: 0x04030a, stars: 1,
    particles: [0xffe135, 0xb14bff, 0x00ffff], glint: 0xffd23f, greebleAccent: 0xffe135,
    windMult: 1.5, instabilityMult: 1.3,
    nativePropIds: ['galaxyWhale', 'planetRing', 'spaceship', 'comet'],
    eventTypes: ['shootingStar', 'meteorShower', 'cometStreak', 'starTwinkle'],
    eventIntervalMs: 15000, // ponytail: 15s—galaxy feels epic and rare
  },
};
