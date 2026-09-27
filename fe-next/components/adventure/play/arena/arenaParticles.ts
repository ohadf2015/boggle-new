/**
 * Arena particle presets (GPU-batched via `ParticlePool`). Electric LexiClash
 * palette, short lifetimes — every burst is gone inside ~0.7s so nothing ever
 * sits on top of the board.
 */
import type { ParticleConfig } from '@/lib/gameEngine/types';

const base = {
  frequency: 0.001,
  emitterLifetime: 0.1,
  spawnShape: 'burst' as const,
  spawnConfig: { directions: 14 },
  blendMode: 'add' as const,
};

/** A cast letter striking the foe: small lime sparks. */
export const LETTER_SPARK: ParticleConfig = {
  ...base,
  maxParticles: 18,
  particlesPerWave: 12,
  lifetime: { min: 0.18, max: 0.42 },
  speed: { min: 120, max: 320 },
  gravity: { x: 0, y: 220 },
  scale: { start: 1.1, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -220, max: 220 },
  colors: ['bfff00', 'ffffff', 'd9ff66'],
};

/** The foe taking a real blow / breaking apart: chunky pink-hot debris. */
export const FOE_DEBRIS: ParticleConfig = {
  ...base,
  maxParticles: 40,
  particlesPerWave: 28,
  lifetime: { min: 0.3, max: 0.75 },
  speed: { min: 180, max: 520 },
  gravity: { x: 0, y: 420 },
  scale: { start: 1.7, end: 0.2 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -300, max: 300 },
  colors: ['ff3366', 'ffd60a', 'ffffff', 'ff8a00'],
  spawnConfig: { directions: 18 },
};

/** The hero being struck: a cyan guard-spark shower. */
export const HERO_SPARK: ParticleConfig = {
  ...base,
  maxParticles: 26,
  particlesPerWave: 18,
  lifetime: { min: 0.22, max: 0.5 },
  speed: { min: 140, max: 380 },
  gravity: { x: 0, y: 300 },
  scale: { start: 1.3, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -180, max: 180 },
  colors: ['22d3ee', 'ffffff', 'bfff00'],
};

/** Loot leaving a corpse: gold glints. */
export const LOOT_POP: ParticleConfig = {
  ...base,
  maxParticles: 26,
  particlesPerWave: 18,
  lifetime: { min: 0.35, max: 0.8 },
  speed: { min: 90, max: 300 },
  gravity: { x: 0, y: -60 },
  scale: { start: 1.2, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -120, max: 120 },
  colors: ['ffd60a', 'fff2a8', 'ffffff'],
};
