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
  ELECTRIC_RINGS,
} from '@/lib/gameEngine/presets/particles';
import {
  LETTER_TAP_POP,
  WORD_SMALL_POP,
  WORD_MEDIUM_BURST,
  WORD_BIG_EXPLOSION,
  WORD_MASSIVE_BURST,
  ERROR_SPARKS,
  URGENCY_EMBERS,
  LETTER_SHATTER,
  CLUE_SPARKLE,
  LIFE_RISING_STARS,
  LIFE_DROP_SHOCK,
  TARGET_FOUND_FIREWORK,
  GAME_WON_FIREWORK,
  GAME_LOST_SMOKE,
} from './wordHuntEffectsPresets';
import { fxCanSleep, fxHoldMs, fxResolution } from './fxSleep';

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
// The board and word stage carry the verdict colour; a strong full-screen wash muddies the header and clues mid-release.
const VERDICT_FLASH_MAX = 0.12;

function EffectsWorker({ effects, onEffectsConsumed }: EffectsWorkerProps) {
  const { app, particles, shake, flash, timeDilation, width, height } = useGameEngine();
  const urgencyEmitterRef = useRef<ReturnType<typeof particles.create> | null>(null);
  const lastEffectAt = useRef(0);
  const holdMs = useRef(0);

  useEffect(() => {
    lastEffectAt.current = performance.now();
    const sleepWhenIdle = () => {
      const idle = fxCanSleep({
        emitters: particles.emitterCount,
        shaking: shake.isShaking,
        flashing: flash.isActive,
        dilating: timeDilation.isActive,
        sinceEffectMs: performance.now() - lastEffectAt.current,
        holdMs: holdMs.current,
      });
      if (idle) app.ticker.stop();
    };
    app.ticker.add(sleepWhenIdle);
    return () => {
      try { app.ticker.remove(sleepWhenIdle); } catch { /* ticker already gone */ }
    };
  }, [app, particles, shake, flash, timeDilation]);

  // Process effects batch
  useEffect(() => {
    if (effects.length === 0) return;
    const now = performance.now();
    const pendingUntil = lastEffectAt.current + holdMs.current;
    lastEffectAt.current = now;
    holdMs.current = Math.max(fxHoldMs(effects), pendingUntil - now);
    app.ticker.start();

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
            flash.flash({ color: 0xbfff00, duration: 0.1, intensity: 0.08 });
          } else if (pts <= 5) {
            particles.burst(WORD_MEDIUM_BURST, effect.x, effect.y);
            flash.flash({ color: 0xbfff00, duration: 0.15, intensity: 0.1 });
            shake.light();
          } else if (pts <= 12) {
            particles.burst(WORD_BIG_EXPLOSION, effect.x, effect.y);
            particles.burst(GOLD_STARS, effect.x, effect.y - 30, 15);
            flash.flash({ color: 0xffcc00, duration: 0.15, intensity: VERDICT_FLASH_MAX });
            shake.medium();
            timeDilation.slowDown(0.3, 0.15);
          } else {
            particles.burst(WORD_MASSIVE_BURST, effect.x, effect.y);
            particles.burst(GOLD_STARS, effect.x, effect.y - 40, 25);
            particles.burst(CONFETTI_BURST, effect.x, effect.y + 20);
            flash.flash({ color: 0xffcc00, duration: 0.15, intensity: VERDICT_FLASH_MAX });
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
          flash.flash({ color: 0xff2200, duration: 0.12, intensity: VERDICT_FLASH_MAX });
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
  }, [app, effects, particles, shake, flash, timeDilation, width, height, onEffectsConsumed]);

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
        antialias: false,
        resolution: fxResolution(typeof window !== 'undefined' ? window.devicePixelRatio : 1),
      }}
      usePhysics={false}
      className="absolute inset-0 pointer-events-none z-10"
    >
      <EffectsWorker effects={effects} onEffectsConsumed={onEffectsConsumed} />
    </GameCanvas>
  );
}

export default WordHuntEffectsCanvas;
