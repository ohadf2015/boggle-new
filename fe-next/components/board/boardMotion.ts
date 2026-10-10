export type SubmitMotionKind = 'accepted' | 'rejected' | 'duplicate' | 'foundByOther';

export const SETTLE_STAGGER_MS = 45;
export const SETTLE_DURATION_MS = 380;
export const INVALID_DURATION_MS = 280;

const SETTLE_FRAMES: Keyframe[] = [
  { transform: 'translateY(0) scale(1)' },
  { transform: 'translateY(-9px) scale(1.14)', offset: 0.35 },
  { transform: 'translateY(1px) scale(0.97)', offset: 0.7 },
  { transform: 'translateY(0) scale(1)' },
];

const INVALID_FRAMES: Keyframe[] = [
  { transform: 'translateX(0)' },
  { transform: 'translateX(-3px)', offset: 0.25 },
  { transform: 'translateX(3px)', offset: 0.5 },
  { transform: 'translateX(-2px)', offset: 0.75 },
  { transform: 'translateX(0)' },
];

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

/**
 * Tiles of a submitted word: a staggered settle for accepted words, a short
 * sideways shake for rejected or duplicate ones. Pure WAAPI on transform only,
 * so it stays on the compositor.
 */
export function playSubmitMotion(tiles: ReadonlyArray<HTMLElement>, kind: SubmitMotionKind): void {
  if (prefersReducedMotion()) return;
  const accepted = kind === 'accepted' || kind === 'foundByOther';
  tiles.forEach((el, i) => {
    if (typeof el.animate !== 'function') return;
    if (accepted) {
      el.animate(SETTLE_FRAMES, {
        duration: SETTLE_DURATION_MS,
        delay: i * SETTLE_STAGGER_MS,
        easing: 'cubic-bezier(0.2, 0.9, 0.3, 1.2)',
      });
    } else {
      el.animate(INVALID_FRAMES, {
        duration: INVALID_DURATION_MS,
        easing: 'ease-in-out',
      });
    }
  });
}
