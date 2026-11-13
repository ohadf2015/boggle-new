import type { HTMLAttributes } from 'react';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProBadgeSize = 'xs' | 'sm' | 'md' | 'lg';

interface ProBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Already-translated label ("Pro", "פרו"). */
  label: string;
  size?: ProBadgeSize;
  /** Hide the crown where the row already has one. */
  crown?: boolean;
  'data-testid'?: string;
}

/**
 * The one Teacher Pro mark: a stamped gold-foil pill with a hard ink edge, a
 * crown, and a light sweep that crosses it every few seconds (and on hover).
 * Look lives in app/pro-badge.css so it paints on first frame; motion stays off
 * under prefers-reduced-motion. Server-safe: no hooks.
 */
export function ProBadge({ label, size = 'sm', crown = true, className, ...rest }: ProBadgeProps) {
  return (
    <span
      data-pro-badge={size}
      className={cn('pro-badge', `pro-badge--${size}`, 'font-neo-display', className)}
      {...rest}
    >
      <span className="pro-badge__shine" aria-hidden="true" />
      {crown ? <Crown className="pro-badge__crown" strokeWidth={2.75} aria-hidden="true" /> : null}
      <span className="pro-badge__label">{label}</span>
    </span>
  );
}

export default ProBadge;
