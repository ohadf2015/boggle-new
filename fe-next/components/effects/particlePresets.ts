/**
 * Particle effect presets for game events.
 * Each preset is a tsParticles ISourceOptions config.
 *
 * Neo-brutalist palette: lime (#BFFF00), pink (#FF1493), cyan (#00FFFF), purple (#8B5CF6)
 */

import type { ISourceOptions } from '@tsparticles/engine';

/** Small golden burst when a word is found */
export const wordFoundPreset: ISourceOptions = {
  fullScreen: false,
  particles: {
    number: { value: 12 },
    color: { value: ['#BFFF00', '#FFE135', '#FFFFFF'] },
    shape: { type: 'square' },
    opacity: { value: { min: 0.6, max: 1 }, animation: { enable: true, speed: 2, destroy: 'min' } },
    size: { value: { min: 3, max: 7 } },
    move: {
      enable: true,
      speed: { min: 4, max: 8 },
      direction: 'none',
      outModes: 'destroy',
      gravity: { enable: true, acceleration: 6 },
    },
    life: { duration: { value: 0.8 }, count: 1 },
    rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 30 } },
  },
  emitters: {
    life: { count: 1, duration: 0.1 },
    rate: { quantity: 12, delay: 0 },
    position: { x: 50, y: 50 },
  },
};

/** Expanding ring when combo breaks */
export const comboBreakPreset: ISourceOptions = {
  fullScreen: false,
  particles: {
    number: { value: 20 },
    color: { value: ['#FF1493', '#FF69B4', '#BFFF00'] },
    shape: { type: 'square' },
    opacity: { value: 1, animation: { enable: true, speed: 3, destroy: 'min' } },
    size: { value: { min: 2, max: 5 } },
    move: {
      enable: true,
      speed: { min: 8, max: 15 },
      direction: 'outside',
      outModes: 'destroy',
    },
    life: { duration: { value: 0.6 }, count: 1 },
  },
  emitters: {
    life: { count: 1, duration: 0.05 },
    rate: { quantity: 20, delay: 0 },
    position: { x: 50, y: 50 },
  },
};

/** Upward confetti shower on level-up */
export const levelUpPreset: ISourceOptions = {
  fullScreen: false,
  particles: {
    number: { value: 40 },
    color: { value: ['#BFFF00', '#FF1493', '#00FFFF', '#8B5CF6', '#FFFFFF'] },
    shape: { type: ['square', 'circle'] },
    opacity: { value: 1, animation: { enable: true, speed: 1, destroy: 'min' } },
    size: { value: { min: 3, max: 8 } },
    move: {
      enable: true,
      speed: { min: 6, max: 12 },
      direction: 'top',
      outModes: 'destroy',
      gravity: { enable: true, acceleration: 4 },
    },
    life: { duration: { value: 2 }, count: 1 },
    rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 40 } },
    tilt: { enable: true, value: { min: 0, max: 360 }, animation: { enable: true, speed: 30 } },
  },
  emitters: {
    life: { count: 1, duration: 0.3 },
    rate: { quantity: 40, delay: 0 },
    position: { x: 50, y: 100 },
    size: { width: 100, height: 0 },
  },
};

/** Full-screen fireworks on victory */
export const victoryPreset: ISourceOptions = {
  fullScreen: false,
  particles: {
    number: { value: 0 },
    color: { value: ['#BFFF00', '#FF1493', '#00FFFF', '#8B5CF6', '#FFE135'] },
    shape: { type: 'square' },
    opacity: { value: { min: 0.5, max: 1 }, animation: { enable: true, speed: 1.5, destroy: 'min' } },
    size: { value: { min: 2, max: 6 } },
    move: {
      enable: true,
      speed: { min: 5, max: 15 },
      direction: 'none',
      outModes: 'destroy',
      gravity: { enable: true, acceleration: 3 },
    },
    life: { duration: { value: 1.5 }, count: 1 },
    rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 40 } },
  },
  emitters: [
    { life: { count: 3, duration: 0.1, delay: 0.4 }, rate: { quantity: 15, delay: 0 }, position: { x: 20, y: 70 } },
    { life: { count: 3, duration: 0.1, delay: 0.6 }, rate: { quantity: 15, delay: 0 }, position: { x: 50, y: 60 } },
    { life: { count: 3, duration: 0.1, delay: 0.8 }, rate: { quantity: 15, delay: 0 }, position: { x: 80, y: 70 } },
  ],
};

/** Star burst on streak milestone */
export const streakMilestonePreset: ISourceOptions = {
  fullScreen: false,
  particles: {
    number: { value: 8 },
    color: { value: ['#FFE135', '#BFFF00'] },
    shape: { type: 'star' },
    opacity: { value: 1, animation: { enable: true, speed: 2, destroy: 'min' } },
    size: { value: { min: 5, max: 12 } },
    move: {
      enable: true,
      speed: { min: 3, max: 8 },
      direction: 'outside',
      outModes: 'destroy',
    },
    life: { duration: { value: 1 }, count: 1 },
    rotate: { value: { min: 0, max: 360 }, animation: { enable: true, speed: 20 } },
  },
  emitters: {
    life: { count: 1, duration: 0.1 },
    rate: { quantity: 8, delay: 0 },
    position: { x: 50, y: 50 },
  },
};

export type ParticlePresetName = 'wordFound' | 'comboBreak' | 'levelUp' | 'victory' | 'streakMilestone';

export const PARTICLE_PRESETS: Record<ParticlePresetName, ISourceOptions> = {
  wordFound: wordFoundPreset,
  comboBreak: comboBreakPreset,
  levelUp: levelUpPreset,
  victory: victoryPreset,
  streakMilestone: streakMilestonePreset,
};
