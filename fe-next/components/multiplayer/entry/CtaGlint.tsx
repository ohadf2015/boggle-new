import type { CSSProperties } from 'react';
import './ctaGlint.css';

/**
 * One glint across a primary CTA, once: a hard-edged band (no soft glow) swept
 * by transform only and clipped to the button. Decorative — aria-hidden and
 * click-through. Place it inside a `relative` wrapper that is exactly the
 * button's box; `delayMs` waits for the button to land first.
 */
export function CtaGlint({ delayMs = 440 }: { delayMs?: number }) {
  return (
    <span
      data-testid="cta-glint"
      aria-hidden="true"
      className="mp-cta-glint pointer-events-none absolute inset-0 overflow-hidden rounded-neo"
      style={{ '--mp-glint-delay': `${delayMs}ms` } as CSSProperties}
    >
      <span />
    </span>
  );
}
