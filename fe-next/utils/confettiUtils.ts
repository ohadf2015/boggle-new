/**
 * Centralized Confetti Utility
 *
 * This module provides a wrapper around canvas-confetti that:
 * 1. Creates a dedicated canvas with data-confetti attribute for CSS targeting
 * 2. Provides consistent confetti configurations for the app
 * 3. Handles errors gracefully
 */

import confettiLib from 'canvas-confetti';
import type { CreateTypes, Options } from 'canvas-confetti';

// Singleton canvas for confetti
let confettiCanvas: HTMLCanvasElement | null = null;
let myConfetti: CreateTypes | null = null;

/**
 * Get or create the confetti canvas with proper attributes
 */
function getConfettiCanvas(): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  if (typeof window === 'undefined') return null;

  if (!confettiCanvas) {
    // Create a new canvas
    confettiCanvas = document.createElement('canvas');
    confettiCanvas.setAttribute('data-confetti', 'true');

    // Set explicit pixel dimensions for the canvas drawing surface
    // This is critical - CSS dimensions alone don't set the drawing surface size
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;

    confettiCanvas.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10000;
    `;
    document.body.appendChild(confettiCanvas);

    // Create confetti instance bound to this canvas
    // Note: useWorker can cause issues in some environments, disabled for reliability
    myConfetti = confettiLib.create(confettiCanvas, {
      resize: true,
      useWorker: false,
    });

    // Handle window resize to update canvas dimensions
    window.addEventListener('resize', () => {
      if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
      }
    });
  }

  return confettiCanvas;
}

/**
 * Fire confetti with the centralized canvas
 */
export function fireConfetti(options: Options = {}): Promise<null> | null {
  // Ensure canvas exists
  getConfettiCanvas();

  if (!myConfetti) {
    console.warn('[Confetti] Failed to initialize confetti canvas');
    return null;
  }

  try {
    return myConfetti({
      zIndex: 10000,
      ...options,
    });
  } catch (error) {
    console.error('[Confetti] Error firing confetti:', error);
    return null;
  }
}

/**
 * Reset the confetti canvas (clears particles)
 */
export function resetConfetti(): void {
  if (myConfetti) {
    myConfetti.reset();
  }
}

// ==================== Preset Confetti Effects ====================

/**
 * Confetti colors for each rank (1st, 2nd, 3rd place)
 */
export const RANK_COLORS: Record<number, string[]> = {
  1: ['#ffd700', '#ffed4a', '#f59e0b', '#fbbf24'], // Gold
  2: ['#c0c0c0', '#94a3b8', '#e2e8f0', '#cbd5e1'], // Silver
  3: ['#cd7f32', '#ea580c', '#f97316', '#fb923c'], // Bronze/Orange
};

/**
 * Default celebration colors
 */
export const DEFAULT_COLORS = ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#a855f7'];

/**
 * Victory celebration colors (green theme)
 */
export const VICTORY_COLORS = ['#10B981', '#FFE135', '#00D9FF', '#34D399'];

/**
 * Streak celebration colors
 */
export const STREAK_COLORS = ['#FF6B35', '#FFE135', '#FF1493', '#FF8C00'];

/**
 * Fire rank-specific confetti burst
 */
export function fireRankConfetti(rank: number = 1): void {
  const count = 100;
  const colors = RANK_COLORS[rank] || RANK_COLORS[1];

  const defaults: Options = {
    origin: { y: 0.7 },
    colors,
  };

  function fire(particleRatio: number, opts: Options): void {
    fireConfetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
}

/**
 * Fire game over celebration confetti
 */
export function fireGameOverConfetti(): void {
  fireConfetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: DEFAULT_COLORS,
  });
}

/**
 * Fire level up celebration confetti
 */
export function fireLevelUpConfetti(): void {
  fireConfetti({
    particleCount: 150,
    spread: 100,
    origin: { y: 0.5 },
    colors: DEFAULT_COLORS,
  });
}

/**
 * Fire victory confetti (for wins)
 */
export function fireVictoryConfetti(): void {
  fireConfetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: VICTORY_COLORS,
  });
}

/**
 * Fire streak milestone confetti
 */
export function fireStreakConfetti(): void {
  fireConfetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.6 },
    colors: STREAK_COLORS,
  });

  // Secondary burst
  setTimeout(() => {
    fireConfetti({
      particleCount: 40,
      spread: 100,
      origin: { y: 0.5 },
      colors: STREAK_COLORS,
    });
  }, 150);
}

/**
 * Fire first win epic celebration (cascading confetti)
 */
export function fireFirstWinConfetti(durationMs: number = 4000): void {
  const colors = ['#FFE135', '#FF6B35', '#00D9FF', '#FF69B4', '#7C3AED', '#10B981'];
  const end = Date.now() + durationMs;

  const frame = () => {
    // Left side burst
    fireConfetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 200,
    });

    // Right side burst
    fireConfetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.6 },
      colors,
      startVelocity: 45,
      gravity: 0.8,
      ticks: 200,
    });

    // Center burst occasionally
    if (Math.random() > 0.7) {
      fireConfetti({
        particleCount: 10,
        angle: 90,
        spread: 120,
        origin: { x: 0.5, y: 0.5 },
        colors,
        startVelocity: 30,
        gravity: 0.6,
        ticks: 150,
      });
    }

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  };

  frame();
}

// Export types for consumers
export type { Options as ConfettiOptions };
