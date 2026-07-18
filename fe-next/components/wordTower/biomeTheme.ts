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
  /** Edge vignette strength 0..1 — deeper space reads more immersive. */
  vignette: number;
  /** Ground / horizon fog opacity 0..1 (city haze → thin space mist). */
  groundFog: number;
  /** CSS colour/gradient for ambient accent glow wash behind props. */
  accentGlow: string;
  /** Biome-native props (prop IDs to show in this biome band). If omitted,
   *  props are included by default; if empty, only generic props appear. */
  nativePropIds?: string[];
  /** Occasional random events unique to this biome (shooting stars, plane flybys, etc).
   *  Event interval in ms — ponytail: heuristic values 6s–15s chosen per biome feel. */
  eventTypes?: BiomeEvent[];
  eventIntervalMs?: number;
  /** Dynamic sun/moon disc colours for this biome. */
  celestial: {
    /** Core disc colour. */
    core: string;
    /** Outer glow colour. */
    glow: string;
    /** Tint applied to the tower by directional light. */
    lightTint: string;
  };
  /** Ambient air-current / dust tint colour. */
  airTint: string;
  /** Silhouette colour for distant landmark layers. */
  landmarkColor: string;
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
    vignette: 0.12, groundFog: 0.38,
    accentGlow: 'radial-gradient(90% 55% at 50% 100%, rgba(255,240,180,0.35), transparent 70%)',
    nativePropIds: ['cityBird', 'birds', 'helicopter', 'plane', 'drone', 'blimp'],
    eventTypes: ['planeFlyby', 'helicopterPass', 'starTwinkle'],
    eventIntervalMs: 8000,
    celestial: { core: '#fff7d6', glow: '#ffd700', lightTint: 'rgba(255,230,150,0.18)' },
    airTint: '#9ccdf2',
    landmarkColor: '#4a6fa5',
  },
  sky: {
    bg: 'linear-gradient(180deg,#16407e 0%,#2f78c4 48%,#73bdf0 100%)',
    block: 0x00ffff, accent: 0x0e2a4e, stars: 0.06,
    particles: [0x00ffff, 0xffffff, 0x73bdf0], glint: 0x00ffff, greebleAccent: 0x00ffff,
    windMult: 1.15, instabilityMult: 1.05,
    vignette: 0.18, groundFog: 0.28,
    accentGlow: 'radial-gradient(80% 50% at 70% 20%, rgba(0,255,255,0.22), transparent 65%)',
    nativePropIds: ['skyManta', 'kite', 'balloon', 'paraglider', 'birds', 'blimp'],
    eventTypes: ['planeFlyby', 'helicopterPass', 'starTwinkle', 'auroraFlare'],
    eventIntervalMs: 9000,
    celestial: { core: '#ffffff', glow: '#e0f7ff', lightTint: 'rgba(180,230,255,0.14)' },
    airTint: '#73bdf0',
    landmarkColor: '#2f5f9e',
  },
  stratosphere: {
    bg: 'linear-gradient(180deg,#211848 0%,#5b3a9e 42%,#b85a93 74%,#f2a65a 100%)',
    block: 0x8b5cf6, accent: 0xfffef0, stars: 0.32,
    particles: [0x8b5cf6, 0xf2a65a, 0xff9ec4], glint: 0xf2a65a, greebleAccent: 0xb98cff,
    windMult: 1.25, instabilityMult: 1.12,
    vignette: 0.32, groundFog: 0.16,
    accentGlow: 'radial-gradient(70% 45% at 30% 30%, rgba(242,166,90,0.28), transparent 60%)',
    nativePropIds: ['stratSerpent', 'plane', 'rocket', 'weather balloon'],
    eventTypes: ['planeFlyby', 'auroraFlare', 'meteorShower', 'starTwinkle'],
    eventIntervalMs: 10000,
    celestial: { core: '#ffe0bd', glow: '#ff9ec4', lightTint: 'rgba(255,180,160,0.16)' },
    airTint: '#ff9ec4',
    landmarkColor: '#3a2870',
  },
  orbit: {
    bg: 'linear-gradient(180deg,#04060f 0%,#0b1230 58%,#16204a 100%)',
    block: 0x00ffff, accent: 0xfffef0, stars: 0.7,
    particles: [0x00ffff, 0xffffff, 0x8be9fd], glint: 0x9ae6ff, greebleAccent: 0x6fe6ff,
    windMult: 1.32, instabilityMult: 1.18,
    vignette: 0.48, groundFog: 0.08,
    accentGlow: 'radial-gradient(60% 40% at 50% 40%, rgba(110,230,255,0.2), transparent 70%)',
    nativePropIds: ['orbitJelly', 'satellite', 'rocket', 'astronaut'],
    eventTypes: ['shootingStar', 'satelliteGlint', 'starTwinkle', 'cometStreak'],
    eventIntervalMs: 11000,
    celestial: { core: '#d4f1ff', glow: '#6fe6ff', lightTint: 'rgba(130,220,255,0.16)' },
    airTint: '#6fe6ff',
    landmarkColor: '#0b1a3a',
  },
  nebula: {
    bg: 'linear-gradient(180deg,#180322 0%,#5a1063 50%,#b81e8c 84%,#ff4fa3 100%)',
    block: 0xff1493, accent: 0xfffef0, stars: 0.85,
    particles: [0xff1493, 0xff4fa3, 0xb14bff], glint: 0xff4fa3, greebleAccent: 0xff79c6,
    windMult: 1.42, instabilityMult: 1.24,
    vignette: 0.55, groundFog: 0.1,
    accentGlow: 'radial-gradient(75% 50% at 60% 35%, rgba(255,79,163,0.3), transparent 65%)',
    nativePropIds: ['nebulaJelly', 'comet', 'alien', 'portal'],
    eventTypes: ['shootingStar', 'cometStreak', 'auroraFlare', 'starTwinkle'],
    eventIntervalMs: 12000,
    celestial: { core: '#ffb3e6', glow: '#ff4fa3', lightTint: 'rgba(255,120,190,0.18)' },
    airTint: '#ff79c6',
    landmarkColor: '#2e0a42',
  },
  galaxy: {
    bg: 'linear-gradient(180deg,#04030a 0%,#2a0a4e 45%,#7a1fae 80%,#ffd23f 100%)',
    block: 0xffe135, accent: 0x04030a, stars: 1,
    particles: [0xffe135, 0xb14bff, 0x00ffff], glint: 0xffd23f, greebleAccent: 0xffe135,
    windMult: 1.5, instabilityMult: 1.3,
    vignette: 0.62, groundFog: 0.06,
    accentGlow: 'radial-gradient(70% 45% at 40% 55%, rgba(255,210,63,0.28), transparent 68%)',
    nativePropIds: ['galaxyWhale', 'planetRing', 'spaceship', 'comet'],
    eventTypes: ['shootingStar', 'meteorShower', 'cometStreak', 'starTwinkle'],
    eventIntervalMs: 15000,
    celestial: { core: '#fff1a8', glow: '#ffd23f', lightTint: 'rgba(255,220,120,0.18)' },
    airTint: '#ffd23f',
    landmarkColor: '#1a0a38',
  },
};
