/**
 * Centralized Confetti Utility
 *
 * This module provides a wrapper around canvas-confetti that:
 * 1. Creates a dedicated canvas with data-confetti attribute for CSS targeting
 * 2. Provides consistent confetti configurations for the app
 * 3. Handles errors gracefully
 */

import confettiLib, { type CreateTypes, type Options, type Shape } from 'canvas-confetti';
import {
  applyCelebrationIntensity,
  isCelebrationSuppressed,
  type CelebrationIntensity,
} from '@/lib/cosy/celebrationScale';
import { emitQuietFeedback } from '@/lib/cosy/quietFeedback';

// Singleton canvas for confetti
let confettiCanvas: HTMLCanvasElement | null = null;

/**
 * Global celebration intensity, synced from Cosy / Calm Mode by the
 * AccessibilityProvider via `setCelebrationIntensity`. Applied at the single
 * `fireConfetti` chokepoint so EVERY caller (presets + non-React modules)
 * scales down under cosy without each having to thread the preference. Defaults
 * to 'full' → behaviour-neutral until cosy flips it.
 */
let celebrationIntensity: CelebrationIntensity = 'full';

/** Set the global celebration intensity (called by AccessibilityProvider). */
export function setCelebrationIntensity(intensity: CelebrationIntensity): void {
  celebrationIntensity = intensity;
}
let myConfetti: CreateTypes | null = null;
let resizeHandler: (() => void) | null = null;
let autoCleanupTimer: ReturnType<typeof setTimeout> | null = null;

/** Auto-cleanup delay: destroy canvas 3s after last confetti fire to free memory */
const AUTO_CLEANUP_DELAY_MS = 3000;

// ==================== Z-Index Constants ====================

/**
 * Centralized z-index constants for layered particle effects
 *
 * These values establish a clear visual hierarchy:
 * - BACKGROUND_PARTICLES (1000): Subtle background layer
 * - MIDGROUND_PARTICLES (2000): Main celebration layer
 * - FOREGROUND_PARTICLES (3000): Foreground accents
 * - CELEBRATION_OVERLAY (9000): UI overlays (modals, toasts)
 * - CINEMATIC_PLAYER (9999): Full-screen cinematics (highest)
 */
export const Z_INDEX = {
  BACKGROUND_PARTICLES: 1000,
  MIDGROUND_PARTICLES: 2000,
  FOREGROUND_PARTICLES: 3000,
  CELEBRATION_OVERLAY: 9000,
  CINEMATIC_PLAYER: 9999,
} as const;

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

    // Handle window resize to update canvas dimensions (throttled to prevent jank)
    let resizeRaf: number | null = null;
    resizeHandler = () => {
      if (resizeRaf !== null) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = null;
        if (confettiCanvas) {
          confettiCanvas.width = window.innerWidth;
          confettiCanvas.height = window.innerHeight;
        }
      });
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
  // Skip confetti entirely on low-end devices to prevent frame drops
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('low-end-device')) {
    return null;
  }

  // B4 (WCAG 2.3.3): respect the OS-level reduced-motion preference at the
  // single chokepoint so every caller (level-up, victory, daily challenge,
  // duel, etc.) is covered without each having to remember the gate.
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return null;
      }
    } catch {
      // matchMedia stubs in test environments may throw — treat as "not set"
    }
  }

  // Cosy / Calm Mode (calm tier): particle effects are OFF for the elder /
  // effect-averse persona. Instead of a smaller explosion we emit ONE quiet
  // dignified beat (a soft checkmark) via the QuietCelebrationLayer — the
  // feedback loop stays alive, just calm. Return before touching the canvas.
  if (isCelebrationSuppressed(celebrationIntensity)) {
    emitQuietFeedback();
    return null;
  }

  // Ensure canvas exists
  getConfettiCanvas();

  if (!myConfetti) {
    console.warn('[Confetti] Failed to initialize confetti canvas');
    return null;
  }

  // Schedule auto-cleanup: destroy canvas after no confetti fires for 3s.
  // Prevents the global singleton from leaking memory in long sessions.
  if (autoCleanupTimer) clearTimeout(autoCleanupTimer);
  autoCleanupTimer = setTimeout(() => {
    autoCleanupTimer = null;
    cleanupConfetti();
  }, AUTO_CLEANUP_DELAY_MS);

  try {
    // Cosy / Calm Mode scales every burst down (fewer particles, tighter
    // spread) — never off; the OS reduced-motion gate above already handles
    // "no animation at all".
    const merged = applyCelebrationIntensity(
      {
        zIndex: 10000,
        ...NEO_BRUTALIST_DEFAULTS,
        ...options,
      },
      celebrationIntensity,
    );
    return myConfetti(merged);
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
  if (autoCleanupTimer) {
    clearTimeout(autoCleanupTimer);
    autoCleanupTimer = null;
  }
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
 * All ranks include pink for visual consistency
 */
export const RANK_COLORS: Record<number, string[]> = {
  1: ['#FFE135', '#BFFF00', '#00FFFF', '#FF1493'], // Gold: yellow, lime, cyan, pink
  2: ['#C0C0C0', '#00FFFF', '#BFFF00', '#FF1493'], // Silver: silver, cyan, lime, pink
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
 * Moderate bursts with chunky square particles
 * @param rank - Player rank (1st, 2nd, 3rd place)
 * @param intensity - 'full' for manual clicks, 'light' for automatic triggers (default: 'full')
 */
export function fireRankConfetti(rank: number = 1, intensity: 'full' | 'light' = 'full'): void {
  // Light intensity uses 40% of full particles for automatic triggers
  const count = intensity === 'light' ? 16 : 40;
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

  // Initial burst
  fire(0.35, { spread: 30, startVelocity: 60, scalar: 1.4 });
  // Wide spread
  fire(0.35, { spread: 70, scalar: 1.2 });
  // Large slow particles
  fire(0.3, { spread: 100, decay: 0.91, scalar: 1.5, startVelocity: 35 });
}

/**
 * Fire game over celebration confetti with neo-brutalist punch
 */
export function fireGameOverConfetti(): void {
  // Main burst with large particles
  fireConfetti({
    particleCount: 30, // Reduced from 100
    spread: 80,
    origin: { y: 0.6 },
    colors: DEFAULT_COLORS,
    scalar: 1.4,
    startVelocity: 45,
  });
  // Secondary smaller burst for depth
  setTimeout(() => {
    fireConfetti({
      particleCount: 20, // Reduced from 60
      spread: 120,
      origin: { y: 0.5 },
      colors: DEFAULT_COLORS,
      scalar: 1.0,
    });
  }, 100);
}

/**
 * Fire level up celebration confetti - moderate dramatic burst
 */
export function fireLevelUpConfetti(): void {
  // Large chunky particles
  fireConfetti({
    particleCount: 35, // Reduced from 100
    spread: 90,
    origin: { y: 0.5 },
    colors: DEFAULT_COLORS,
    scalar: 1.6,
    startVelocity: 50,
  });
  // Follow-up smaller burst
  setTimeout(() => {
    fireConfetti({
      particleCount: 25, // Reduced from 80
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
    particleCount: 25, // Reduced from 80
    spread: 60,
    origin: { y: 0.6 },
    colors: VICTORY_COLORS,
    scalar: 1.3,
    startVelocity: 55,
  });
  // Wider follow-up
  setTimeout(() => {
    fireConfetti({
      particleCount: 15, // Reduced from 50
      spread: 100,
      origin: { y: 0.5 },
      colors: VICTORY_COLORS,
      scalar: 1.1,
    });
  }, 80);
}

/**
 * Fire a light, short burst for onboarding FTUE beats.
 * Tuned to be quick (no follow-up delay) so it doesn't slow step transitions.
 *
 * @param origin - Where the burst originates (default: center, slightly above middle)
 * @param colors - Custom palette (defaults to the 5 neo-brutalist accents)
 */
export function fireOnboardingBurst(
  origin: { x?: number; y?: number } = { x: 0.5, y: 0.55 },
  colors: string[] = NEO_BRUTALIST_COLORS
): void {
  fireConfetti({
    particleCount: 22,
    spread: 75,
    startVelocity: 42,
    origin,
    colors,
    scalar: 1.15,
    ticks: 120,
  });
}

/**
 * Fire streak milestone confetti - moderate multi-burst
 */
export function fireStreakConfetti(): void {
  // Initial burst
  fireConfetti({
    particleCount: 20, // Reduced from 70
    spread: 60,
    origin: { y: 0.6 },
    colors: STREAK_COLORS,
    scalar: 1.4,
    startVelocity: 50,
  });

  // Secondary wider burst
  setTimeout(() => {
    fireConfetti({
      particleCount: 15, // Reduced from 50
      spread: 110,
      origin: { y: 0.5 },
      colors: STREAK_COLORS,
      scalar: 1.2,
    });
  }, 100);
}

/**
 * Fire first win celebration (cascading confetti)
 * Neo-brutalist style with chunky particles and bold colors
 * @returns Cancel function to stop the animation (call on unmount)
 */
export function fireFirstWinConfetti(durationMs: number = 1500): () => void {
  const colors = NEO_BRUTALIST_COLORS;
  const end = Date.now() + durationMs;
  let rafId: number | null = null;
  let cancelled = false;
  let frameCount = 0;

  const frame = () => {
    if (cancelled) return;
    frameCount++;

    // Side bursts every 6th frame — was every 3rd. Cuts particle drizzle in half
    // without losing the cascading-from-the-corners shape.
    if (frameCount % 6 === 0) {
      // Left side burst
      fireConfetti({
        particleCount: 1,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.6 },
        colors,
        startVelocity: 55,
        gravity: 1.0,
        ticks: 160,
        scalar: 1.2,
      });

      // Right side burst
      fireConfetti({
        particleCount: 1,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.6 },
        colors,
        startVelocity: 55,
        gravity: 1.0,
        ticks: 160,
        scalar: 1.2,
      });
    }

    // Center burst rare-ish punctuation only — was Math.random()>0.85.
    if (Math.random() > 0.95) {
      fireConfetti({
        particleCount: 3,
        angle: 90,
        spread: 100,
        origin: { x: 0.5, y: 0.5 },
        colors,
        startVelocity: 40,
        gravity: 0.8,
        ticks: 120,
        scalar: 1.4,
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

/**
 * Fire layered celebration with background, midground, and foreground particles
 *
 * Creates depth perception through:
 * - Budget split: 20% background, 60% midground, 20% foreground
 * - Timing delays: 0ms, 100ms, 200ms
 * - Z-index layering: 1000, 2000, 3000
 * - Variable origins and spreads for depth
 *
 * @param duration - Duration of celebration in ms (unused, for API compatibility)
 * @param budget - Particle budget object from useParticleBudget hook
 *
 * @example
 * ```tsx
 * const budget = useParticleBudget();
 * fireLayeredCelebration(2000, budget);
 * ```
 */
export function fireLayeredCelebration(duration: number, budget: { combo: number }): void {
  // Use 80% of combo budget for safety margin
  const totalBudget = Math.floor(budget.combo * 0.8);

  // Budget split: 20% background, 60% midground, 20% foreground
  const backgroundCount = Math.floor(totalBudget * 0.2);
  const midgroundCount = Math.floor(totalBudget * 0.6);
  const foregroundCount = Math.floor(totalBudget * 0.2);

  // Layer 1: Background (immediate, subtle, distant)
  fireConfetti({
    particleCount: backgroundCount,
    spread: 80,
    origin: { y: 0.7 },
    zIndex: Z_INDEX.BACKGROUND_PARTICLES,
    scalar: 1.0,
    startVelocity: 35,
    flat: true,
    shapes: NEO_BRUTALIST_SHAPES,
    colors: NEO_BRUTALIST_COLORS,
  });

  // Layer 2: Midground (100ms delay, main celebration, largest)
  setTimeout(() => {
    fireConfetti({
      particleCount: midgroundCount,
      spread: 100,
      origin: { y: 0.6 },
      zIndex: Z_INDEX.MIDGROUND_PARTICLES,
      scalar: 1.3,
      startVelocity: 50,
      flat: true,
      shapes: NEO_BRUTALIST_SHAPES,
      colors: NEO_BRUTALIST_COLORS,
    });
  }, 100);

  // Layer 3: Foreground (200ms delay, close accents, pop)
  setTimeout(() => {
    fireConfetti({
      particleCount: foregroundCount,
      spread: 60,
      origin: { y: 0.5 },
      zIndex: Z_INDEX.FOREGROUND_PARTICLES,
      scalar: 1.5,
      startVelocity: 60,
      flat: true,
      shapes: NEO_BRUTALIST_SHAPES,
      colors: NEO_BRUTALIST_COLORS,
    });
  }, 200);
}

/**
 * Fire firework burst celebration - dramatic upward explosion effect
 * Creates multiple bursts at different positions for stadium-like celebration
 *
 * @param count - Number of firework bursts (default: 3)
 * @param duration - Total duration in ms (default: 2000)
 * @returns Cancel function to stop the animation
 */
export function fireFireworks(count: number = 3, durationMs: number = 2000): () => void {
  const colors = NEO_BRUTALIST_COLORS;
  let cancelled = false;
  const timeouts: NodeJS.Timeout[] = [];

  // Fire multiple bursts at staggered intervals
  for (let i = 0; i < count; i++) {
    const delay = (i * durationMs) / count;
    const timeout = setTimeout(() => {
      if (cancelled) return;

      // Random horizontal position
      const xPos = 0.2 + Math.random() * 0.6;

      // Initial upward trail
      fireConfetti({
        particleCount: 8,
        angle: 90,
        spread: 15,
        origin: { x: xPos, y: 1 },
        colors: [colors[i % colors.length] || '#FFE135'],
        startVelocity: 80,
        gravity: 1.5,
        ticks: 100,
        scalar: 0.8,
      });

      // Delayed burst at peak
      const burstTimeout = setTimeout(() => {
        if (cancelled) return;

        // Main burst
        fireConfetti({
          particleCount: 40,
          spread: 360,
          origin: { x: xPos, y: 0.3 },
          colors,
          startVelocity: 30,
          gravity: 0.8,
          ticks: 150,
          scalar: 1.2,
          flat: true,
          shapes: NEO_BRUTALIST_SHAPES,
        });

        // Sparkle follow-up
        fireConfetti({
          particleCount: 20,
          spread: 180,
          origin: { x: xPos, y: 0.35 },
          colors,
          startVelocity: 20,
          gravity: 0.6,
          ticks: 100,
          scalar: 0.8,
        });
      }, 400);

      timeouts.push(burstTimeout);
    }, delay);

    timeouts.push(timeout);
  }

  // Return cleanup function
  return () => {
    cancelled = true;
    timeouts.forEach(t => clearTimeout(t));
  };
}

// Export types for consumers
export type { Options as ConfettiOptions };
