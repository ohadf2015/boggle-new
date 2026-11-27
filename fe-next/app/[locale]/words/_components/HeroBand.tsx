import type { ReactNode } from 'react';
import { AmbientBackdrop } from '@/components/motion/AmbientBackdrop';
import { cn } from '@/lib/utils';

/** Full-width hero so the backdrop's edge shapes land in the empty gutters, never under body copy. */
export function HeroBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className="relative isolate">
      <AmbientBackdrop theme="solo" hill={false} className="hidden lg:block" />
      <div className={cn('mx-auto px-4 pt-8 pb-6', className)}>{children}</div>
    </section>
  );
}
