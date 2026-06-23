'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';

/**
 * Reveal — a CSS-based entrance animation (fade + subtle rise).
 *
 * Drop-in replacement for the fragile framer-motion pattern used inside many
 * popups/modals:
 *
 *   <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} ... />
 *
 * WHY THIS EXISTS
 * ---------------
 * framer-motion entrance animations are JS-driven: the element is rendered at its
 * invisible `initial` state and only animated to `animate` by a main-thread
 * animation loop (rAF). If that loop is starved or interrupted — e.g. while the
 * browser parses the large Hebrew translation bundle, or during a re-render storm
 * — the loop never advances and the content stays pinned at `opacity: 0`. The
 * Radix dialog panel itself still renders (it animates via CSS), so the user sees
 * a dark panel with no visible content: "an empty black screen / only the
 * backdrop". This was reproduced deterministically: with real framer-motion an
 * `m.div initial={{ opacity: 0 }}` stays at `opacity: 0` whenever the loop does
 * not run.
 *
 * CSS animations (tailwindcss-animate `animate-in fade-in-0 ...`) run off the
 * main thread and, crucially, settle to the element's natural resting state
 * (opacity: 1) even if the keyframes are interrupted or never play. Content can
 * therefore never get stuck invisible. This mirrors how the Radix dialog/overlay
 * primitives already animate, which is exactly why those never exhibited the bug.
 *
 * Note: no per-item stagger `delay` is supported on purpose. A delay would
 * require `animation-fill-mode: backwards` to avoid a flash, which reintroduces a
 * "hidden until the animation runs" state. Reliability beats a staggered cascade
 * for modal content.
 */
type RevealElement = 'div' | 'li' | 'span' | 'form' | 'section';

export interface RevealProps extends React.HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to 'div'. */
  as?: RevealElement;
  /** Disable the slide so it only fades (use when a transform would shift layout). */
  noSlide?: boolean;
}

export const Reveal = React.forwardRef<HTMLElement, RevealProps>(
  ({ as = 'div', noSlide = false, className, children, ...props }, ref) => {
    return React.createElement(
      as,
      {
        ref,
        className: cn(
          'animate-in fade-in-0 duration-300',
          !noSlide && 'slide-in-from-bottom-1',
          className
        ),
        ...props,
      },
      children
    );
  }
);

Reveal.displayName = 'Reveal';

export default Reveal;
