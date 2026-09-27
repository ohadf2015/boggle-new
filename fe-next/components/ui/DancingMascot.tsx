import { cn } from '@/lib/utils';
import { pickDanceLoop } from '@/lib/playerStyle/danceLoops';

interface DancingMascotProps {
  /**
   * Deterministic loop selector. The same seed always renders the same mascot,
   * so a server-rendered loader and its client hydration agree (no mismatch).
   * Omit for the default loop; pass a per-session value (e.g. a mounted random)
   * from a client surface that wants variety.
   */
  seed?: number;
  /** Explicit loop path — overrides the seed pick (e.g. always show k-pop). */
  src?: string;
  /** Sizing / layout classes for the image box. */
  className?: string;
  /** Decorative by default (empty alt). Set when the mascot conveys status. */
  alt?: string;
}

/**
 * A transparent, genre-flavoured dancing mascot loop — the cube character
 * bopping, headbanging, doing a K-pop point. Reuses the hero style loops so the
 * personality shows up on splash + loading surfaces, not just for players who
 * picked a music style.
 *
 * Plain `<img>` (not next/image) on purpose: the asset is an already-optimised
 * animated WebP, and next/image's optimizer freezes animations on frame 1. No
 * hooks → renders fine in both server (loading.tsx) and client trees.
 */
export function DancingMascot({ seed, src, className, alt = '' }: DancingMascotProps) {
  const loopSrc = src ?? pickDanceLoop(seed).src;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      data-testid="dancing-mascot"
      src={loopSrc}
      alt={alt}
      draggable={false}
      className={cn('object-contain select-none pointer-events-none', className)}
    />
  );
}

export default DancingMascot;
