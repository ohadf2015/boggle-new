import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** The Teacher Pro marker on a round-end control, so a free teacher knows before the tap. */
export function ProPill({ label, className }: { label: string; className?: string }) {
  return (
    <span
      data-testid="pro-pill"
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border-2 border-neo-black bg-neo-yellow px-2 py-0.5 font-neo-display text-xs font-black leading-none text-neo-black @[96rem]/results:text-sm',
        className
      )}
    >
      <Crown className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />
      {label}
    </span>
  );
}

export default ProPill;
