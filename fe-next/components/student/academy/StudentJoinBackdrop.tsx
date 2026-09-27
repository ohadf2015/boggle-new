'use client';

/**
 * The Academy arena behind `/student/join`. The flow itself is the shared
 * `JoinFlow` (same screen as `/join`, pitfall class 3); this only paints the
 * world behind it.
 *
 * Stacking: rendered BEFORE the flow with no z-index, so the flow (positioned,
 * later in the DOM, root made transparent by the page) and its success confetti
 * (portaled to <body>) paint above it. Static — no entrance opacity tween on a
 * fullscreen layer (pitfall class 5).
 */

import Image from 'next/image';

export function StudentJoinBackdrop() {
  return (
    <div
      data-testid="student-join-backdrop"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden bg-neo-navy"
    >
      <Image
        src="/images/education/arena-lobby-bg.webp"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="select-none object-cover object-center"
      />
      {/* Darken the middle where the code boxes sit, keep the arena lights at the edges. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(15,17,40,0.82)_0%,rgba(15,17,40,0.55)_45%,rgba(15,17,40,0.25)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-neo-navy/90 to-transparent" />
    </div>
  );
}
