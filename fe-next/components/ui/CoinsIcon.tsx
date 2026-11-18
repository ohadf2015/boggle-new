import { forwardRef } from 'react';
import type { LucideProps } from 'lucide-react';

/** Lucide's coin stack minus its inner tick, which reads as the Hebrew letter ך at small sizes. */
export const Coins = forwardRef<SVGSVGElement, LucideProps>(function Coins(
  { size = 24, color = 'currentColor', strokeWidth = 2, absoluteStrokeWidth: _absolute, children, ...props },
  ref,
) {
  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden={props['aria-label'] ? undefined : true} {...props}>
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      {children}
    </svg>
  );
});
