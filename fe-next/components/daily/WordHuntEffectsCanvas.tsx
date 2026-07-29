'use no memo';
'use client';

// ─── Word Hunt Effects Canvas ───────────────────────────────────────
// PixiJS particle/celebration layer for the Word Hunt Survival mode.
// Renders transparently above the game DOM. Purely visual — no interactivity.
// Survival flavor: heavier urgency embers, life-drop shock, target-found freeze.

import { useEffect, useRef } from 'react';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import {
  CONFETTI_BURST,
  GOLD_STARS,
  TILE_EXPLOSION,
  CASCADE_SPARKLE,
  FIRE_EMBERS,
  ELECTRIC_RINGS,
} from '@/lib/gameEngine/presets/particles';
import type { ParticleConfig } from '@/lib/gameEngine/types';

// ─── Custom Presets ─────────────────────────────────────────────────

const LETTER_TAP_POP: ParticleConfig = {
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

const WORD_SMALL_POP: ParticleConfig = {
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

const WORD_MEDIUM_BURST: ParticleConfig = {
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

const WORD_BIG_EXPLOSION: ParticleConfig = {
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

const WORD_MASSIVE_BURST: ParticleConfig = {
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

const ERROR_SPARKS: ParticleConfig = {
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

const URGENCY_EMBERS: ParticleConfig = {
  ...FIRE_EMBERS,
  maxParticles: 18,
  particlesPerWave: 2,
  frequency: 0.08,
  emitterLifetime: -1,
  colors: ['ff2200', 'ff4400', 'ff6600', 'ffaa00'],
  spawnShape: 'rect',
};

const LETTER_SHATTER: ParticleConfig = {
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

const CLUE_SPARKLE: ParticleConfig = {
  ...GOLD_STARS,
  maxParticles: 16,
  particlesPerWave: 16,
};

const LIFE_RISING_STARS: ParticleConfig = {
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

const LIFE_DROP_SHOCK: ParticleConfig = {
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

const TARGET_FOUND_FIREWORK: ParticleConfig = {
  ...CONFETTI_BURST,
  maxParticles: 80,
  particlesPerWave: 80,
  speed: { min: 180, max: 600 },
  lifetime: { min: 1.2, max: 2.8 },
};

const GAME_WON_FIREWORK: ParticleConfig = {
  ...CONFETTI_BURST,
  maxParticles: 120,
  particlesPerWave: 120,
  speed: { min: 200, max: 800 },
  lifetime: { min: 1.5, max: 3.5 },
};

const GAME_LOST_SMOKE: ParticleConfig = {
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

// ─── Effect Types ───────────────────────────────────────────────────

export type WordHuntEffect =
  | { type: 'letterTap'; x: number; y: number }
  | { type: 'wordValid'; x: number; y: number; points: number }
  | { type: 'targetFound'; x: number; y: number }
  | { type: 'invalid'; x: number; y: number }
  | { type: 'letterEliminated'; x: number; y: number }
  | { type: 'clueGain' }
  | { type: 'lifeGain'; amount: number }
  | { type: 'lifeDrop'; amount: number }
  | { type: 'lowLife' }
  | { type: 'gameWon'; score: number }
  | { type: 'gameLost' };

// ─── Effects Worker ─────────────────────────────────────────────────

interface EffectsWorkerProps {
  effects: WordHuntEffect[];
  onEffectsConsumed: () => void;
}

const WORD_VALID_COOLDOWN_MS = 80;

function EffectsWorker({ effects, onEffectsConsumed }: EffectsWorkerProps) {
  const { particles, shake, flash, timeDilation, width, height } = useGameEngine();
  const urgencyEmitterRef = useRef<ReturnType<typeof particles.create> | null>(null);

  // Process effects batch
  useEffect(() => {
    if (effects.length === 0) return;

    let lastWordValidTime = -Infinity;

    for (const effect of effects) {
      switch (effect.type) {
        // ── Letter tap ──
        case 'letterTap':
          particles.burst(LETTER_TAP_POP, effect.x, effect.y);
          break;

        // ── Valid word — tier-scaled celebration ──
        case 'wordValid': {
          const now = Date.now();
          if (now - lastWordValidTime < WORD_VALID_COOLDOWN_MS) break;
          lastWordValidTime = now;

          const pts = effect.points;

          if (pts <= 1) {
            particles.burst(WORD_SMALL_POP, effect.x, effect.y);
            flash.flash({ color: 0xbfff00, duration: 0.1, intensity: 0.15 });
          } else if (pts <= 5) {
            particles.burst(WORD_MEDIUM_BURST, effect.x, effect.y);
            flash.flash({ color: 0xbfff00, duration: 0.15, intensity: 0.25 });
            shake.light();
          } else if (pts <= 12) {
            particles.burst(WORD_BIG_EXPLOSION, effect.x, effect.y);
            particles.burst(GOLD_STARS, effect.x, effect.y - 30, 15);
            flash.flash({ color: 0xffcc00, duration: 0.2, intensity: 0.3 });
            shake.medium();
            timeDilation.slowDown(0.3, 0.15);
          } else {
            particles.burst(WORD_MASSIVE_BURST, effect.x, effect.y);
            particles.burst(GOLD_STARS, effect.x, effect.y - 40, 25);
            particles.burst(CONFETTI_BURST, effect.x, effect.y + 20);
            flash.flash({ color: 0xffcc00, duration: 0.25, intensity: 0.4 });
            shake.heavy();
            timeDilation.slowDown(0.2, 0.2);
            setTimeout(() => {
              particles.burst(TILE_EXPLOSION, effect.x - 50, effect.y);
              particles.burst(TILE_EXPLOSION, effect.x + 50, effect.y);
            }, 150);
          }
          break;
        }

        // ── Target word found — multi-wave firework + freeze ──
        case 'targetFound': {
          timeDilation.freeze(0.15);
          particles.burst(TARGET_FOUND_FIREWORK, effect.x, effect.y);
          particles.burst(GOLD_STARS, effect.x, effect.y - 40, 25);
          flash.gold();
          shake.heavy();

          setTimeout(() => {
            particles.burst(CONFETTI_BURST, effect.x - 70, effect.y - 30);
            particles.burst(CONFETTI_BURST, effect.x + 70, effect.y - 30);
            particles.burst(ELECTRIC_RINGS, effect.x, effect.y);
            shake.medium();
          }, 300);

          setTimeout(() => {
            particles.burst(GOLD_STARS, effect.x, effect.y - 60, 20);
            particles.burst(CASCADE_SPARKLE, effect.x, effect.y);
            flash.flash({ color: 0xffcc00, duration: 0.2, intensity: 0.35 });
          }, 600);
          break;
        }

        // ── Invalid input ──
        case 'invalid':
          particles.burst(ERROR_SPARKS, effect.x, effect.y);
          flash.danger();
          shake.shake({ intensity: 4, duration: 0.12, decay: 'exponential', frequency: 40 });
          break;

        // ── Letter eliminated by enemy ──
        case 'letterEliminated':
          particles.burst(LETTER_SHATTER, effect.x, effect.y);
          shake.light();
          flash.flash({ color: 0xff3366, duration: 0.1, intensity: 0.15 });
          break;

        // ── Clue gained ──
        case 'clueGain': {
          const cx = width / 2;
          const cy = height / 2;
          particles.burst(CLUE_SPARKLE, cx, cy, 16);
          flash.flash({ color: 0xffcc00, duration: 0.2, intensity: 0.3 });
          break;
        }

        // ── Life gained ──
        case 'lifeGain': {
          const cx = width / 2;
          const cy = height - 60;
          particles.burst(LIFE_RISING_STARS, cx, cy);
          flash.flash({ color: 0xbfff00, duration: 0.15, intensity: 0.2 });
          break;
        }

        // ── Life dropped — heavy hit flashes red ──
        case 'lifeDrop': {
          const cx = width / 2;
          const cy = height / 2;
          particles.burst(LIFE_DROP_SHOCK, cx, cy);
          if (effect.amount > 5) {
            flash.danger();
            shake.medium();
          } else if (effect.amount > 2) {
            shake.light();
          }
          break;
        }

        // ── Low life — start persistent urgency embers (idempotent) ──
        case 'lowLife':
          if (!urgencyEmitterRef.current) {
            urgencyEmitterRef.current = particles.create({
              ...URGENCY_EMBERS,
              spawnConfig: { width, height: 12 },
            });
            urgencyEmitterRef.current.emit(width / 2, height - 18);
          }
          break;

        // ── Game won — multi-wave firework spectacular ──
        case 'gameWon': {
          const cx = width / 2;
          const cy = height / 2;
          const isGoodScore = effect.score >= 30;
          const isExcellent = effect.score >= 50;

          particles.burst(GAME_WON_FIREWORK, cx, cy);
          flash.white();
          shake.heavy();
          timeDilation.freeze(0.2);

          setTimeout(() => {
            particles.burst(CONFETTI_BURST, cx - 100, cy - 80);
            particles.burst(CONFETTI_BURST, cx + 100, cy - 80);
            particles.burst(GOLD_STARS, cx, cy - 60, 25);
          }, 300);

          setTimeout(() => {
            particles.burst(GOLD_STARS, cx - 60, cy - 100, 15);
            particles.burst(GOLD_STARS, cx + 60, cy - 100, 15);
            shake.light();
          }, 600);

          if (isGoodScore) {
            setTimeout(() => {
              particles.burst(CONFETTI_BURST, cx, cy);
              particles.burst(ELECTRIC_RINGS, cx, cy);
              flash.gold();
              shake.medium();
            }, 1200);
          }

          if (isExcellent) {
            setTimeout(() => {
              particles.burst(WORD_MASSIVE_BURST, cx, cy);
              particles.burst(CONFETTI_BURST, cx - 80, cy + 40);
              particles.burst(CONFETTI_BURST, cx + 80, cy + 40);
              flash.flash({ color: 0xff44ff, duration: 0.3, intensity: 0.5 });
              shake.heavy();
            }, 1500);
          }

          urgencyEmitterRef.current = null;
          break;
        }

        // ── Game lost — somber smoke + slow-down ──
        case 'gameLost': {
          const cx = width / 2;
          const cy = height / 2;
          particles.burst(GAME_LOST_SMOKE, cx, cy);
          flash.danger();
          shake.medium();
          timeDilation.slowDown(0.2, 0.6);

          urgencyEmitterRef.current = null;
          break;
        }
      }
    }

    onEffectsConsumed();
  }, [effects, particles, shake, flash, timeDilation, width, height, onEffectsConsumed]);

  return null;
}

// ─── Main Component ─────────────────────────────────────────────────

interface WordHuntEffectsCanvasProps {
  width: number;
  height: number;
  effects: WordHuntEffect[];
  onEffectsConsumed: () => void;
}

export function WordHuntEffectsCanvas({
  width,
  height,
  effects,
  onEffectsConsumed,
}: WordHuntEffectsCanvasProps) {
  return (
    <GameCanvas
      config={{
        width,
        height,
        background: 0x000000,
        backgroundAlpha: 0,
        antialias: true,
      }}
      usePhysics={false}
      className="absolute inset-0 pointer-events-none z-10"
    >
      <EffectsWorker effects={effects} onEffectsConsumed={onEffectsConsumed} />
    </GameCanvas>
  );
}

export default WordHuntEffectsCanvas;
