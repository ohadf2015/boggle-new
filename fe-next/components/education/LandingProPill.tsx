import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The one "Pro" mark: a Crown pill shown on anything a free teacher cannot use, before
 * they click it. Server-safe (no hooks) so server copy and client buttons share it.
 */
export function LandingProPill({ label = 'Pro', className }: { label?: string; className?: string }) {
  return (
    <span
      data-testid="pro-pill"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black uppercase leading-none tracking-wide text-neo-navy',
        className,
      )}
    >
      <Crown className="size-3.5" strokeWidth={2.75} aria-hidden="true" />
      {label}
    </span>
  );
}

export default LandingProPill;
