// ─── Pixi FX Presets ──────────────────────────────────────────────────
// Semantic preset names → ParticleConfig. Keeps call sites decoupled
// from particle internals. Add new presets here.

import type { ParticleConfig } from '../gameEngine/types';

type PresetName =
  | 'sparkle'
  | 'sparkle-valid'
  | 'sparkle-invalid'
  | 'sparkle-gold'
  | 'coin-collect'
  | 'coin-burst'
  | 'combo-pulse'
  | 'chain-burst'
  | 'word-trail'
  | 'celebration'
  | 'level-up-burst'
  | 'word-found'
  | 'combo-break'
  | 'victory-burst'
  | 'boost-freezeTime'
  | 'boost-hint'
  | 'boost-scoreMultiplier'
  | 'boost-firstWordBonus';

// Palette drawn from neo-brutalist design system (no #).
const LIME = 'BFFF00';
const PINK = 'FF1493';
const CYAN = '00FFFF';
const YELLOW = 'FFE135';
const ORANGE = 'FF6B35';
const GOLD = 'FFD700';
const RED = 'FF3366';
const GREEN = '34D399';

function sparkle(colors: string[]): ParticleConfig {
  return {
    maxParticles: 20,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 12,
    lifetime: { min: 0.4, max: 0.7 },
    speed: { min: 80, max: 180 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 3, max: 6 },
    colors,
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'star',
  };
}

export const PRESETS: Record<PresetName, ParticleConfig> = {
  sparkle: sparkle([YELLOW, ORANGE, CYAN]),
  'sparkle-valid': sparkle([LIME, CYAN, GREEN]),
  'sparkle-invalid': sparkle([PINK, RED, ORANGE]),
  'sparkle-gold': sparkle([GOLD, YELLOW, ORANGE]),

  'coin-collect': {
    maxParticles: 16,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 8,
    lifetime: { min: 0.5, max: 0.8 },
    speed: { min: 60, max: 140 },
    gravity: { x: 0, y: 200 },
    scale: { start: 1.2, end: 0.4 },
    alpha: { start: 1, end: 0 },
    colors: [GOLD, YELLOW],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'circle',
  },

  'coin-burst': {
    maxParticles: 20,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 12,
    lifetime: { min: 0.5, max: 0.9 },
    speed: { min: 80, max: 200 },
    scale: { start: 1, end: 0.3 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 3, max: 6 },
    colors: [GOLD, YELLOW, ORANGE],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'circle',
  },

  'combo-pulse': {
    maxParticles: 1,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 1,
    lifetime: { min: 0.5, max: 0.5 },
    speed: { min: 0, max: 0 },
    scale: { start: 0.5, end: 4 },
    alpha: { start: 0.8, end: 0 },
    colors: [ORANGE, YELLOW],
    spawnShape: 'point',
    blendMode: 'add',
    shape: 'ring-3',
  },

  'chain-burst': {
    maxParticles: 24,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 16,
    lifetime: { min: 0.3, max: 0.6 },
    speed: { min: 100, max: 220 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 1, end: 0 },
    colors: [CYAN, LIME],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'diamond',
  },

  'word-trail': {
    maxParticles: 30,
    frequency: 0.02,
    emitterLifetime: 0.3,
    particlesPerWave: 2,
    lifetime: { min: 0.4, max: 0.6 },
    speed: { min: 10, max: 40 },
    scale: { start: 0.8, end: 0 },
    alpha: { start: 0.9, end: 0 },
    colors: [CYAN, LIME, YELLOW],
    spawnShape: 'point',
    blendMode: 'add',
    shape: 'circle',
  },

  celebration: {
    maxParticles: 60,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 48,
    lifetime: { min: 0.8, max: 1.4 },
    speed: { min: 120, max: 320 },
    gravity: { x: 0, y: 180 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 4, max: 8 },
    colors: [YELLOW, GOLD, PINK, CYAN, LIME],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'star',
  },

  // Level-up badge radial burst (replaces 8 framer-motion divs).
  // 8 lime diamonds, ~0.8s lifetime, rotating out from badge center.
  'level-up-burst': {
    maxParticles: 8,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 8,
    lifetime: { min: 0.7, max: 0.8 },
    speed: { min: 90, max: 110 },
    scale: { start: 0, end: 1.5 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 3, max: 4 },
    colors: [LIME],
    spawnShape: 'burst',
    blendMode: 'normal',
    shape: 'diamond',
  },

  // Blast: word-found — gentle lime/yellow shower with gravity.
  'word-found': {
    maxParticles: 24,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 16,
    lifetime: { min: 0.6, max: 0.8 },
    speed: { min: 240, max: 480 },
    gravity: { x: 0, y: 360 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 3, max: 6 },
    colors: [LIME, YELLOW, 'FFFFFF'],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'diamond',
  },

  // Blast: combo-break — sharp radial, no gravity, short lifetime.
  'combo-break': {
    maxParticles: 24,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 16,
    lifetime: { min: 0.4, max: 0.6 },
    speed: { min: 480, max: 900 },
    scale: { start: 1.1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 4, max: 8 },
    colors: [PINK, LIME],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'diamond',
  },

  // Boost: freezeTime — icy diamond shards, no gravity (frozen-in-air feel).
  'boost-freezeTime': {
    maxParticles: 20,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 14,
    lifetime: { min: 0.6, max: 0.9 },
    speed: { min: 80, max: 200 },
    scale: { start: 1.1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 1, max: 3 },
    colors: [CYAN, 'FFFFFF', '7DD3FC'],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'diamond',
  },

  // Boost: hint — bright lightbulb stars, fast pop, slight gravity.
  'boost-hint': {
    maxParticles: 16,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 12,
    lifetime: { min: 0.5, max: 0.8 },
    speed: { min: 100, max: 220 },
    gravity: { x: 0, y: 80 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 4, max: 8 },
    colors: [YELLOW, LIME, 'FFFFFF'],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'star',
  },

  // Boost: scoreMultiplier — high-stakes pink/gold shower with gravity.
  'boost-scoreMultiplier': {
    maxParticles: 24,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 18,
    lifetime: { min: 0.7, max: 1.1 },
    speed: { min: 200, max: 420 },
    gravity: { x: 0, y: 280 },
    scale: { start: 1.1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 4, max: 8 },
    colors: [PINK, GOLD, YELLOW],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'star',
  },

  // Boost: firstWordBonus — encouraging lime/cyan ring-out (MP only).
  'boost-firstWordBonus': {
    maxParticles: 18,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 12,
    lifetime: { min: 0.5, max: 0.9 },
    speed: { min: 120, max: 260 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 3, max: 6 },
    colors: [LIME, CYAN, 'FFFFFF'],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'diamond',
  },

  // Blast: victory-burst — staggered celebration, 5-color stars.
  'victory-burst': {
    maxParticles: 40,
    frequency: 0,
    emitterLifetime: 0.01,
    particlesPerWave: 32,
    lifetime: { min: 1.2, max: 1.5 },
    speed: { min: 300, max: 900 },
    gravity: { x: 0, y: 180 },
    scale: { start: 1, end: 0 },
    alpha: { start: 1, end: 0 },
    rotationSpeed: { min: 3, max: 8 },
    colors: [YELLOW, GOLD, PINK, CYAN, LIME],
    spawnShape: 'burst',
    blendMode: 'add',
    shape: 'star',
  },
};

export type { PresetName };
