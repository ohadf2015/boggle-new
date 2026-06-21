'use no memo';
'use client';

// ─── Word Wheel Effects Canvas ──────────────────────────────────────
// PixiJS particle/celebration layer for the Word Wheel game.
// Renders transparently above the game DOM. Purely visual — no interactivity.
// Juicy game feel: combo escalation, hit-stop, urgency fire, scaled celebrations.

import { useEffect, useRef } from 'react';
import { GameCanvas, useGameEngine } from '@/lib/gameEngine/GameCanvas';
import {
  CONFETTI_BURST,
  GOLD_STARS,
  AMBIENT_BOKEH,
  TILE_EXPLOSION,
  COMBO_FLASH,
  COMBO_FLASH_RING,
  CASCADE_SPARKLE,
  FIRE_EMBERS,
  ELECTRIC_RINGS,
  LIGHTNING_SPARK,
} from '@/lib/gameEngine/presets/particles';
import type { ParticleConfig } from '@/lib/gameEngine/types';

// ─── Custom Presets ─────────────────────────────────────────────────

const LETTER_TAP_POP: ParticleConfig = {
  maxParticles: 10,
  frequency: 0.001,
  emitterLifetime: 0.06,
  particlesPerWave: 10,
  lifetime: { min: 0.15, max: 0.4 },
  speed: { min: 60, max: 160 },
  gravity: { x: 0, y: -40 },
  scale: { start: 0.7, end: 0 },
  alpha: { start: 1, end: 0 },
  colors: ['bfff00', 'ffffff', '88ff44', '00ffff'],
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
  colors: ['bfff00', 'ffffff', '00ffff', 'ffcc00', '88ff44'],
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
  colors: ['bfff00', 'ffffff', '00ffff', 'ffcc00', 'ff44ff', '88ff44'],
  spawnShape: 'burst',
  spawnConfig: { directions: 20 },
  blendMode: 'add',
  shape: 'star',
};

const PANGRAM_MEGA_BURST: ParticleConfig = {
  maxParticles: 100,
  frequency: 0.001,
  emitterLifetime: 0.2,
  particlesPerWave: 100,
  lifetime: { min: 1.0, max: 2.5 },
  speed: { min: 150, max: 700 },
  gravity: { x: 0, y: 250 },
  scale: { start: 1.8, end: 0.3 },
  alpha: { start: 1, end: 0.4 },
  rotationSpeed: { min: -540, max: 540 },
  colors: ['ff4444', 'ffaa00', 'bfff00', '00ffff', 'ff44ff', 'ffff44', '8b5cf6'],
  spawnShape: 'burst',
  spawnConfig: { directions: 24 },
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
  maxParticles: 15,
  particlesPerWave: 2,
  frequency: 0.08,
  emitterLifetime: 1.0,
  colors: ['ff2200', 'ff4400', 'ff6600', 'ffaa00'],
  spawnShape: 'rect',
};

const GAME_COMPLETE_FIREWORK: ParticleConfig = {
  ...CONFETTI_BURST,
  maxParticles: 120,
  particlesPerWave: 120,
  speed: { min: 200, max: 800 },
  lifetime: { min: 1.5, max: 3.5 },
};

// ─── Effect Types ───────────────────────────────────────────────────

export type WordWheelEffect =
  | { type: 'letterTap'; x: number; y: number }
  | { type: 'wordValid'; x: number; y: number; points: number }
  | { type: 'pangram'; x: number; y: number }
  | { type: 'error'; x: number; y: number }
  | { type: 'combo'; x: number; y: number; combo: number }
  | { type: 'gameComplete'; score: number }
  | { type: 'timeWarning' }
  | { type: 'timeTick'; secondsLeft: number };

// ─── Effects Worker ─────────────────────────────────────────────────

interface EffectsWorkerProps {
  effects: WordWheelEffect[];
  onEffectsConsumed: () => void;
}

function EffectsWorker({ effects, onEffectsConsumed }: EffectsWorkerProps) {
  const { particles, shake, flash, timeDilation, width, height } = useGameEngine();
  const ambientRef = useRef(false);
  const urgencyEmitterRef = useRef<ReturnType<typeof particles.create> | null>(null);

  // Ambient floating particles — the calm backdrop behind the wheel.
  // The shared AMBIENT_BOKEH preset peaks at alpha 0.15 with ~1px specks in a
  // cool blue palette; over bg-neo-navy (#1a1a2e) that's imperceptible, so the
  // play area read as flat solid black. Override the visibility-driving fields
  // here (word-wheel only — the shared preset is untouched) so the layer reads
  // as a gentle, additive lime/cyan/violet glow that gives the board depth.
  useEffect(() => {
    if (ambientRef.current) return;
    ambientRef.current = true;
    const emitter = particles.create({
      ...AMBIENT_BOKEH,
      maxParticles: 38,
      frequency: 0.13,
      lifetime: { min: 4, max: 8 },
      speed: { min: 4, max: 12 },
      scale: { start: 0.6, end: 1.8 },
      alpha: { start: 0, end: 0.24 },
      colors: ['bfff00', '00ffff', '8b5cf6'],
      blendMode: 'add',
      spawnConfig: { width, height },
    });
    emitter.emit(width / 2, height / 2);
  }, [particles, width, height]);

  // Process effects
  useEffect(() => {
    if (effects.length === 0) return;

    for (const effect of effects) {
      switch (effect.type) {
        // ── Letter tap: satisfying pop ──
        case 'letterTap':
          particles.burst(LETTER_TAP_POP, effect.x, effect.y);
          break;

        // ── Valid word: scaled by word length/points ──
        case 'wordValid': {
          const pts = effect.points;

          if (pts <= 1) {
            // 3-letter: small satisfying pop
            particles.burst(WORD_SMALL_POP, effect.x, effect.y);
            flash.flash({ color: 0xbfff00, duration: 0.1, intensity: 0.15 });
          } else if (pts <= 5) {
            // 4-5 letter: medium burst + light shake
            particles.burst(WORD_MEDIUM_BURST, effect.x, effect.y);
            flash.flash({ color: 0xbfff00, duration: 0.15, intensity: 0.25 });
            shake.light();
          } else if (pts <= 12) {
            // 6-7 letter: big explosion + gold stars + medium shake
            particles.burst(WORD_BIG_EXPLOSION, effect.x, effect.y);
            particles.burst(GOLD_STARS, effect.x, effect.y - 30, 15);
            flash.flash({ color: 0xffcc00, duration: 0.2, intensity: 0.3 });
            shake.medium();
            // Brief hit-stop for big words
            timeDilation.slowDown(0.3, 0.15);
          } else {
            // 8+ letter: massive explosion + confetti + hit-stop
            particles.burst(WORD_BIG_EXPLOSION, effect.x, effect.y);
            particles.burst(GOLD_STARS, effect.x, effect.y - 40, 25);
            particles.burst(CONFETTI_BURST, effect.x, effect.y + 20);
            flash.flash({ color: 0xffcc00, duration: 0.25, intensity: 0.4 });
            shake.heavy();
            timeDilation.slowDown(0.2, 0.2);
            // Delayed second wave
            setTimeout(() => {
              particles.burst(TILE_EXPLOSION, effect.x - 50, effect.y);
              particles.burst(TILE_EXPLOSION, effect.x + 50, effect.y);
            }, 150);
          }
          break;
        }

        // ── Combo milestones: escalating celebration ──
        case 'combo': {
          const c = effect.combo;
          if (c >= 2 && c < 5) {
            // x2-x4: combo flash ring
            particles.burst(COMBO_FLASH, effect.x, effect.y);
            flash.combo();
          } else if (c >= 5 && c < 10) {
            // x5-x9: electric rings + bigger shake
            particles.burst(COMBO_FLASH, effect.x, effect.y);
            particles.burst(ELECTRIC_RINGS, effect.x, effect.y);
            flash.flash({ color: 0x00ffff, duration: 0.2, intensity: 0.4 });
            shake.medium();
            timeDilation.slowDown(0.4, 0.12);
          } else if (c >= 10) {
            // x10+: LEGENDARY combo — full screen celebration
            particles.burst(COMBO_FLASH, effect.x, effect.y);
            particles.burst(ELECTRIC_RINGS, effect.x, effect.y);
            particles.burst(LIGHTNING_SPARK, effect.x, effect.y);
            particles.burst(CONFETTI_BURST, effect.x, effect.y);
            flash.flash({ color: 0xff44ff, duration: 0.3, intensity: 0.5 });
            shake.heavy();
            timeDilation.slowDown(0.2, 0.25);
          }
          break;
        }

        // ── Pangram: ultimate celebration ──
        case 'pangram': {
          // Hit-stop freeze for dramatic impact
          timeDilation.freeze(0.12);

          // Main explosion
          particles.burst(PANGRAM_MEGA_BURST, effect.x, effect.y);
          particles.burst(GOLD_STARS, effect.x, effect.y - 40, 30);
          particles.burst(CONFETTI_BURST, effect.x, effect.y + 20);
          flash.flash({ color: 0xffcc00, duration: 0.35, intensity: 0.55 });
          shake.heavy();

          // Wave 2: flanking explosions
          setTimeout(() => {
            particles.burst(TILE_EXPLOSION, effect.x - 80, effect.y);
            particles.burst(TILE_EXPLOSION, effect.x + 80, effect.y);
            particles.burst(ELECTRIC_RINGS, effect.x, effect.y);
          }, 200);

          // Wave 3: rising stars
          setTimeout(() => {
            particles.burst(GOLD_STARS, effect.x - 40, effect.y - 60, 15);
            particles.burst(GOLD_STARS, effect.x + 40, effect.y - 60, 15);
            shake.medium();
          }, 400);

          // Wave 4: final confetti rain
          setTimeout(() => {
            particles.burst(CONFETTI_BURST, effect.x, effect.y - 30);
            flash.gold();
          }, 600);
          break;
        }

        // ── Error: punchy rejection ──
        case 'error':
          particles.burst(ERROR_SPARKS, effect.x, effect.y);
          shake.shake({ intensity: 4, duration: 0.12, decay: 'exponential', frequency: 40 });
          flash.danger();
          break;

        // ── Time warning: start urgency mode ──
        case 'timeWarning':
          flash.danger();
          shake.medium();
          // Start persistent fire embers along bottom edge
          if (!urgencyEmitterRef.current) {
            urgencyEmitterRef.current = particles.create({
              ...URGENCY_EMBERS,
              spawnConfig: { width, height: 10 },
            });
            urgencyEmitterRef.current.emit(width / 2, height - 20);
          }
          break;

        // ── Timer tick: escalating urgency in final seconds ──
        case 'timeTick': {
          const s = effect.secondsLeft;
          if (s <= 5) {
            // Final 5 seconds: red pulse flash that intensifies
            const intensity = 0.1 + (5 - s) * 0.06;
            flash.flash({ color: 0xff2200, duration: 0.15, intensity });
            if (s <= 3) {
              shake.shake({ intensity: 2 + (3 - s), duration: 0.1, decay: 'linear', frequency: 35 });
            }
          }
          break;
        }

        // ── Game complete: multi-wave firework spectacular ──
        case 'gameComplete': {
          const cx = width / 2;
          const cy = height / 2;
          const isGoodScore = effect.score >= 30;
          const isExcellent = effect.score >= 50;

          // Wave 1: central explosion
          particles.burst(GAME_COMPLETE_FIREWORK, cx, cy);
          flash.white();
          shake.heavy();
          timeDilation.freeze(0.2);

          // Wave 2: flanking bursts
          setTimeout(() => {
            particles.burst(CONFETTI_BURST, cx - 100, cy - 80);
            particles.burst(CONFETTI_BURST, cx + 100, cy - 80);
            particles.burst(GOLD_STARS, cx, cy - 60, 25);
          }, 300);

          // Wave 3: rain of stars
          setTimeout(() => {
            particles.burst(GOLD_STARS, cx - 60, cy - 100, 15);
            particles.burst(GOLD_STARS, cx + 60, cy - 100, 15);
            shake.light();
          }, 600);

          if (isGoodScore) {
            // Wave 4: celebration confetti
            setTimeout(() => {
              particles.burst(CONFETTI_BURST, cx, cy);
              particles.burst(ELECTRIC_RINGS, cx, cy);
              flash.gold();
              shake.medium();
            }, 900);
          }

          if (isExcellent) {
            // Wave 5: legendary finale
            setTimeout(() => {
              particles.burst(PANGRAM_MEGA_BURST, cx, cy);
              particles.burst(CONFETTI_BURST, cx - 80, cy + 40);
              particles.burst(CONFETTI_BURST, cx + 80, cy + 40);
              flash.flash({ color: 0xff44ff, duration: 0.3, intensity: 0.5 });
              shake.heavy();
            }, 1200);

            // Wave 6: final starburst
            setTimeout(() => {
              particles.burst(GOLD_STARS, cx, cy - 40, 30);
              flash.white();
            }, 1500);
          }

          // Stop urgency embers
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

interface WordWheelEffectsCanvasProps {
  width: number;
  height: number;
  effects: WordWheelEffect[];
  onEffectsConsumed: () => void;
}

export function WordWheelEffectsCanvas({
  width,
  height,
  effects,
  onEffectsConsumed,
}: WordWheelEffectsCanvasProps) {
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

export default WordWheelEffectsCanvas;
