import { CONFETTI_BURST, GOLD_STARS, FIRE_EMBERS } from '@/lib/gameEngine/presets/particles';
import type { ParticleConfig } from '@/lib/gameEngine/types';

export const LETTER_TAP_POP: ParticleConfig = {
  maxParticles: 8,
  frequency: 0.001,
  emitterLifetime: 0.06,
  particlesPerWave: 8,
  lifetime: { min: 0.12, max: 0.35 },
  speed: { min: 60, max: 160 },
  gravity: { x: 0, y: -40 },
  scale: { start: 0.7, end: 0 },
  alpha: { start: 1, end: 0 },
  colors: ['bfff00', 'ffffff', '00ffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 8 },
  blendMode: 'add',
  shape: 'star',
};

export const WORD_SMALL_POP: ParticleConfig = {
  maxParticles: 15,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 15,
  lifetime: { min: 0.2, max: 0.5 },
  speed: { min: 80, max: 250 },
  gravity: { x: 0, y: 120 },
  scale: { start: 1.0, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -180, max: 180 },
  colors: ['bfff00', 'ffffff', '00ffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 8 },
  blendMode: 'add',
};

export const WORD_MEDIUM_BURST: ParticleConfig = {
  maxParticles: 35,
  frequency: 0.001,
  emitterLifetime: 0.12,
  particlesPerWave: 35,
  lifetime: { min: 0.3, max: 0.8 },
  speed: { min: 120, max: 400 },
  gravity: { x: 0, y: 180 },
  scale: { start: 1.3, end: 0 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -300, max: 300 },
  colors: ['bfff00', 'ffffff', '00ffff', 'ffcc00'],
  spawnShape: 'burst',
  spawnConfig: { directions: 14 },
  blendMode: 'add',
  shape: 'star',
};

export const WORD_BIG_EXPLOSION: ParticleConfig = {
  maxParticles: 60,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 60,
  lifetime: { min: 0.5, max: 1.2 },
  speed: { min: 150, max: 550 },
  gravity: { x: 0, y: 200 },
  scale: { start: 1.5, end: 0.2 },
  alpha: { start: 1, end: 0.3 },
  rotationSpeed: { min: -400, max: 400 },
  colors: ['bfff00', 'ffffff', '00ffff', 'ffcc00', 'ff44ff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 20 },
  blendMode: 'add',
  shape: 'star',
};

export const WORD_MASSIVE_BURST: ParticleConfig = {
  maxParticles: 90,
  frequency: 0.001,
  emitterLifetime: 0.2,
  particlesPerWave: 90,
  lifetime: { min: 1.0, max: 2.2 },
  speed: { min: 180, max: 700 },
  gravity: { x: 0, y: 240 },
  scale: { start: 1.7, end: 0.3 },
  alpha: { start: 1, end: 0.4 },
  rotationSpeed: { min: -540, max: 540 },
  colors: ['ff4444', 'ffaa00', 'bfff00', '00ffff', 'ff44ff', 'ffff44'],
  spawnShape: 'burst',
  spawnConfig: { directions: 22 },
  shape: 'rect',
};

export const ERROR_SPARKS: ParticleConfig = {
  maxParticles: 14,
  frequency: 0.001,
  emitterLifetime: 0.08,
  particlesPerWave: 14,
  lifetime: { min: 0.12, max: 0.3 },
  speed: { min: 100, max: 250 },
  gravity: { x: 0, y: 120 },
  scale: { start: 0.8, end: 0 },
  alpha: { start: 0.9, end: 0 },
  colors: ['ff3366', 'ff6644', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 10 },
  blendMode: 'add',
};

export const URGENCY_EMBERS: ParticleConfig = {
  ...FIRE_EMBERS,
  maxParticles: 18,
  particlesPerWave: 2,
  frequency: 0.08,
  emitterLifetime: -1,
  colors: ['ff2200', 'ff4400', 'ff6600', 'ffaa00'],
  spawnShape: 'rect',
};

export const LETTER_SHATTER: ParticleConfig = {
  maxParticles: 18,
  frequency: 0.001,
  emitterLifetime: 0.1,
  particlesPerWave: 18,
  lifetime: { min: 0.25, max: 0.6 },
  speed: { min: 120, max: 320 },
  gravity: { x: 0, y: 220 },
  scale: { start: 1.0, end: 0.1 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -360, max: 360 },
  colors: ['ff3366', 'ffffff', 'ff6644'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
  shape: 'rect',
};

export const CLUE_SPARKLE: ParticleConfig = {
  ...GOLD_STARS,
  maxParticles: 16,
  particlesPerWave: 16,
};

export const LIFE_RISING_STARS: ParticleConfig = {
  maxParticles: 20,
  frequency: 0.001,
  emitterLifetime: 0.15,
  particlesPerWave: 20,
  lifetime: { min: 0.6, max: 1.3 },
  speed: { min: 100, max: 220 },
  gravity: { x: 0, y: -180 },
  scale: { start: 1.0, end: 0.2 },
  alpha: { start: 1, end: 0 },
  rotationSpeed: { min: -200, max: 200 },
  colors: ['bfff00', 'ffcc00', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
  blendMode: 'add',
  shape: 'star',
};

export const LIFE_DROP_SHOCK: ParticleConfig = {
  maxParticles: 16,
  frequency: 0.001,
  emitterLifetime: 0.08,
  particlesPerWave: 16,
  lifetime: { min: 0.2, max: 0.45 },
  speed: { min: 120, max: 320 },
  gravity: { x: 0, y: 200 },
  scale: { start: 1.0, end: 0 },
  alpha: { start: 1, end: 0 },
  colors: ['ff3366', 'ff2200', 'ffffff'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
  blendMode: 'add',
};

export const TARGET_FOUND_FIREWORK: ParticleConfig = {
  ...CONFETTI_BURST,
  maxParticles: 80,
  particlesPerWave: 80,
  speed: { min: 180, max: 600 },
  lifetime: { min: 1.2, max: 2.8 },
};

export const GAME_WON_FIREWORK: ParticleConfig = {
  ...CONFETTI_BURST,
  maxParticles: 120,
  particlesPerWave: 120,
  speed: { min: 200, max: 800 },
  lifetime: { min: 1.5, max: 3.5 },
};

export const GAME_LOST_SMOKE: ParticleConfig = {
  maxParticles: 30,
  frequency: 0.001,
  emitterLifetime: 0.4,
  particlesPerWave: 30,
  lifetime: { min: 1.0, max: 2.5 },
  speed: { min: 40, max: 160 },
  gravity: { x: 0, y: -30 },
  scale: { start: 1.4, end: 0.6 },
  alpha: { start: 0.8, end: 0 },
  rotationSpeed: { min: -90, max: 90 },
  colors: ['666666', '333333', 'ff3366', '442222'],
  spawnShape: 'burst',
  spawnConfig: { directions: 12 },
};
