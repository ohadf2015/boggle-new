'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { EduMascot } from '@/components/education/EduMascot';
import type { EduMascotPose } from '@/lib/education/mascotArt';

/**
 * The mascot with a speech bubble that says the teacher's next step.
 * The bubble is real text (read by screen readers); the mascot is decorative.
 */
export function MascotBubble({
  pose,
  children,
  size = 72,
  className,
  testId,
}: {
  pose: EduMascotPose;
  children: ReactNode;
  size?: number;
  className?: string;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className={cn('flex items-center gap-2', className)}>
      <EduMascot
        moment={pose}
        size={size}
        className="shrink-0 drop-shadow-[3px_3px_0_rgb(var(--neo-black))]"
      />
      <p
        className={cn(
          'relative min-w-0 rounded-neo-lg border-[3px] border-neo-black bg-neo-cream px-3 py-2 font-neo-body text-sm font-semibold leading-snug text-neo-black shadow-hard-lg sm:text-base',
          // Tail toward the mascot; flips with the text direction.
          "before:absolute before:top-4 before:-start-[11px] before:border-8 before:border-transparent before:border-e-neo-black before:content-['']",
        )}
      >
        {children}
      </p>
    </div>
  );
}

export default MascotBubble;
