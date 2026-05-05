'use client';

/**
 * BlastCountUp — number count-up tween for the after-wave score readout.
 * GSAP-driven. Locale-aware formatting via toLocaleString. Reduced-motion
 * skips the tween + lands directly on the final value.
 *
 * Why a dedicated component: the score is the single most-stared-at number
 * on the results screen. Static `toLocaleString()` reads as a static label;
 * a count-up reads as "this number was earned". 0.9s sweep + small final
 * bump conveys completion without distracting from the headline.
 */

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

interface BlastCountUpProps {
  value: number;
  /** Tween duration in seconds. */
  duration?: number;
  /** Locale for number formatting (delegated to toLocaleString). */
  locale?: string;
  /** Optional className for styling the span. */
  className?: string;
  /** Test id for E2E hooks. */
  'data-testid'?: string;
}

export function BlastCountUp({
  value, duration = 0.9, locale, className,
  'data-testid': testId = 'blast-count-up',
}: BlastCountUpProps) {
  const elRef = useRef<HTMLSpanElement>(null);
  // Mutable counter object so GSAP can tween its `n` property in place
  // without React re-rendering on every frame (we write the DOM directly).
  const counterRef = useRef({ n: 0 });

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    const reduced = typeof window !== 'undefined'
      && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isTestEnv = typeof process !== 'undefined' && process.env?.VITEST === 'true';

    if (reduced || isTestEnv) {
      el.textContent = value.toLocaleString(locale);
      counterRef.current.n = value;
      return;
    }

    const startFrom = counterRef.current.n;
    const tween = gsap.to(counterRef.current, {
      n: value,
      duration,
      ease: 'power2.out',
      onUpdate: () => {
        if (!el) return;
        el.textContent = Math.round(counterRef.current.n).toLocaleString(locale);
      },
      onComplete: () => {
        if (!el) return;
        el.textContent = value.toLocaleString(locale);
        // Tiny snap-shake at the end so the eye registers the "landing".
        gsap.fromTo(el, { x: 0 },
          { x: 0, duration: 0.12, ease: 'power2.out',
            keyframes: [{ x: 3 }, { x: -2 }, { x: 0 }] },
        );
      },
    });

    const counter = counterRef.current;
    return () => {
      tween.kill();
      // Leave counter at the destination so next mount picks up correctly.
      counter.n = value;
    };
  // Re-run when value changes — usually mounts once on results screen.
  }, [value, duration, locale]);

  return (
    <span ref={elRef} data-testid={testId} className={className}>
      {/* Initial render shows 0 so the tween reads as "earned"; if reduced-
          motion / test env, useEffect overwrites synchronously below. */}
      {(0).toLocaleString(locale)}
    </span>
  );
}
