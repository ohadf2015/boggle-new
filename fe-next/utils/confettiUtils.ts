/**
 * Centralized Confetti Utility
 *
 * This module provides a wrapper around canvas-confetti that:
 * 1. Creates a dedicated canvas with data-confetti attribute for CSS targeting
 * 2. Provides consistent confetti configurations for the app
 * 3. Handles errors gracefully
 */

import confettiLib, { type CreateTypes, type Options, type Shape } from 'canvas-confetti';

// Singleton canvas for confetti
let confettiCanvas: HTMLCanvasElement | null = null;
let myConfetti: CreateTypes | null = null;
let resizeHandler: (() => void) | null = null;

// ==================== Neo-Brutalist Confetti Configuration ====================

/**
 * Neo-Brutalist color palette matching the design system
 * Primary: yellow, pink, cyan, lime, red (5 accent colors)
 */
export const NEO_BRUTALIST_COLORS = [
  '#FFE135', // neo-yellow
  '#FF1493', // neo-pink
  '#00FFFF', // neo-cyan
  '#BFFF00', // neo-lime
  '#FF3366', // neo-red
];

/**
 * Neo-Brutalist shapes - squares for that chunky geometric aesthetic
 * Using mostly squares with occasional circle for variety
 */
export const NEO_BRUTALIST_SHAPES: Shape[] = ['square', 'square', 'square', 'circle'];

/**
 * Default neo-brutalist confetti options
 * - flat: true removes 3D wobble for cleaner geometric look
 * - larger scalar for chunkier particles
 */
export const NEO_BRUTALIST_DEFAULTS: Partial<Options> = {
  flat: true,
  shapes: NEO_BRUTALIST_SHAPES,
  colors: NEO_BRUTALIST_COLORS,
  scalar: 1.2,
  gravity: 1.2,
  ticks: 150,
};

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

    // Handle window resize to update canvas dimensions (with cleanup capability)
    resizeHandler = () => {
      if (confettiCanvas) {
        confettiCanvas.width = window.innerWidth;
        confettiCanvas.height = window.innerHeight;
      }
    };
    window.addEventListener('resize', resizeHandler);
  }

  return confettiCanvas;
}

/**
 * Fire confetti with the centralized canvas
 * Applies Neo-Brutalist defaults (flat squares, bold colors) unless overridden
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
      ...NEO_BRUTALIST_DEFAULTS,
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

/**
 * Cleanup confetti resources (call on unmount/navigation)
 * Removes resize listener and canvas to prevent memory leaks
 */
export function cleanupConfetti(): void {
  if (resizeHandler) {
    window.removeEventListener('resize', resizeHandler);
    resizeHandler = null;
  }
  if (myConfetti) {
    myConfetti.reset();
    myConfetti = null;
  }
  if (confettiCanvas) {
    confettiCanvas.remove();
    confettiCanvas = null;
  }
}

// ==================== Preset Confetti Effects ====================

/**
 * Neo-Brutalist confetti colors for each rank (1st, 2nd, 3rd place)
 * Uses bold, high-contrast colors from the design system
 */
export const RANK_COLORS: Record<number, string[]> = {
  1: ['#FFE135', '#BFFF00', '#00FFFF'], // Gold: yellow, lime, cyan
  2: ['#C0C0C0', '#00FFFF', '#BFFF00'], // Silver: silver + cyan, lime accents
  3: ['#FF6B35', '#FF1493', '#FFE135'], // Bronze: orange, pink, yellow
};

/**
 * Default celebration colors - Neo-Brutalist 5-accent palette
 */
export const DEFAULT_COLORS = NEO_BRUTALIST_COLORS;

/**
 * Victory celebration colors - emphasis on lime/cyan for success
 */
export const VICTORY_COLORS = ['#BFFF00', '#FFE135', '#00FFFF', '#FF1493'];

/**
 * Streak celebration colors - warm/hot tones for intensity
 */
export const STREAK_COLORS = ['#FF1493', '#FFE135', '#FF3366', '#00FFFF'];

/**
 * Fire rank-specific confetti burst with neo-brutalist styling
 * More dramatic bursts with chunky square particles
 */
export function fireRankConfetti(rank: number = 1): void {
  const count = 120;
  const colors = RANK_COLORS[rank] || RANK_COLORS[1];

  const defaults: Options = {
    origin: { y: 0.7 },
    colors,
    flat: true,
    shapes: NEO_BRUTALIST_SHAPES,
  };

  function fire(particleRatio: number, opts: Options): void {
    fireConfetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  // Initial explosive burst
  fire(0.3, { spread: 30, startVelocity: 60, scalar: 1.4 });
  // Wide spread
  fire(0.25, { spread: 70, scalar: 1.2 });
  // Large slow particles for drama
  fire(0.3, { spread: 100, decay: 0.91, scalar: 1.5, startVelocity: 35 });
  // Fast outer particles
  fire(0.15, { spread: 140, startVelocity: 50, scalar: 1.0 });
}

/**
 * Fire game over celebration confetti with neo-brutalist punch
 */
export function fireGameOverConfetti(): void {
  // Main burst with large particles
  fireConfetti({
    particleCount: 100,
    spread: 80,
    origin: { y: 0.6 },
    colors: DEFAULT_COLORS,
    scalar: 1.4,
    startVelocity: 45,
  });
  // Secondary smaller burst for depth
  setTimeout(() => {
    fireConfetti({
      particleCount: 60,
      spread: 120,
      origin: { y: 0.5 },
      colors: DEFAULT_COLORS,
      scalar: 1.0,
    });
  }, 100);
}

/**
 * Fire level up celebration confetti - big dramatic burst
 */
export function fireLevelUpConfetti(): void {
  // Large chunky particles
  fireConfetti({
    particleCount: 100,
    spread: 90,
    origin: { y: 0.5 },
    colors: DEFAULT_COLORS,
    scalar: 1.6,
    startVelocity: 50,
  });
  // Follow-up smaller burst
  setTimeout(() => {
    fireConfetti({
      particleCount: 80,
      spread: 140,
      origin: { y: 0.4 },
      colors: DEFAULT_COLORS,
      scalar: 1.1,
    });
  }, 120);
}

/**
 * Fire victory confetti (for wins) - celebratory burst
 */
export function fireVictoryConfetti(): void {
  // Explosive center burst
  fireConfetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.6 },
    colors: VICTORY_COLORS,
    scalar: 1.3,
    startVelocity: 55,
  });
  // Wider follow-up
  setTimeout(() => {
    fireConfetti({
      particleCount: 50,
      spread: 100,
      origin: { y: 0.5 },
      colors: VICTORY_COLORS,
      scalar: 1.1,
    });
  }, 80);
}

/**
 * Fire streak milestone confetti - intense multi-burst
 */
export function fireStreakConfetti(): void {
  // Initial intense burst
  fireConfetti({
    particleCount: 70,
    spread: 60,
    origin: { y: 0.6 },
    colors: STREAK_COLORS,
    scalar: 1.4,
    startVelocity: 50,
  });

  // Secondary wider burst
  setTimeout(() => {
    fireConfetti({
      particleCount: 50,
      spread: 110,
      origin: { y: 0.5 },
      colors: STREAK_COLORS,
      scalar: 1.2,
    });
  }, 100);

  // Final accent burst
  setTimeout(() => {
    fireConfetti({
      particleCount: 30,
      spread: 140,
      origin: { y: 0.4 },
      colors: STREAK_COLORS,
      scalar: 1.0,
    });
  }, 200);
}

/**
 * Fire first win epic celebration (cascading confetti)
 * Neo-brutalist style with chunky particles and bold colors
 * @returns Cancel function to stop the animation (call on unmount)
 */
export function fireFirstWinConfetti(durationMs: number = 4000): () => void {
  const colors = NEO_BRUTALIST_COLORS;
  const end = Date.now() + durationMs;
  let rafId: number | null = null;
  let cancelled = false;

  const frame = () => {
    if (cancelled) return;

    // Left side burst - chunky particles
    fireConfetti({
      particleCount: 5,
      angle: 60,
      spread: 50,
      origin: { x: 0, y: 0.6 },
      colors,
      startVelocity: 55,
      gravity: 1.0,
      ticks: 180,
      scalar: 1.3,
    });

    // Right side burst - chunky particles
    fireConfetti({
      particleCount: 5,
      angle: 120,
      spread: 50,
      origin: { x: 1, y: 0.6 },
      colors,
      startVelocity: 55,
      gravity: 1.0,
      ticks: 180,
      scalar: 1.3,
    });

    // Center burst occasionally - larger dramatic particles
    if (Math.random() > 0.7) {
      fireConfetti({
        particleCount: 12,
        angle: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
        startVelocity: 40,
        gravity: 0.8,
        ticks: 140,
        scalar: 1.5,
      });
    }

    if (Date.now() < end && !cancelled) {
      rafId = requestAnimationFrame(frame);
    }
  };

  frame();

  // Return cleanup function
  return () => {
    cancelled = true;
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
    }
  };
}

// Export types for consumers
export type { Options as ConfettiOptions };
