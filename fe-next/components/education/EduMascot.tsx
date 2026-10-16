'use client';

import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { cn } from '@/lib/utils';
import { EDU_MASCOT, EDU_MASCOT_VIDEO, type EduMascotPose } from '@/lib/education/mascotArt';

/**
 * Decorative education mascot for one moment. The transparent still is the
 * default; `animate` plays the pose's loop on its own round plate (the loops
 * carry an opaque background). Reduced motion always paints the still.
 */
export function EduMascot({
  moment,
  size,
  className,
  animate = false,
}: {
  moment: EduMascotPose;
  size: number;
  className?: string;
  animate?: boolean;
}) {
  const reduced = usePrefersReducedMotion();
  const loop = (EDU_MASCOT_VIDEO as Partial<Record<EduMascotPose, { src: string; poster: string }>>)[moment];
  const video = loop?.src;
  const poster = loop?.poster;

  if (animate && video && !reduced) {
    return (
      <span className={cn('block overflow-hidden rounded-full bg-[#0d122b]', className)}>
      <video
        data-testid={`edu-mascot-${moment}`}
        src={video}
        poster={poster}
        width={size}
        height={size}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden="true"
        className="pointer-events-none size-full select-none object-cover"
      />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- transparent mascot still
    <img
      data-testid={`edu-mascot-${moment}`}
      src={EDU_MASCOT[moment]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      decoding="async"
      className={cn('pointer-events-none select-none object-contain', className)}
    />
  );
}

export default EduMascot;
