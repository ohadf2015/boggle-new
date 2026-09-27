'use client';

import { useRef, useEffect, useState } from 'react';

/**
 * Counts up from 0 to `value` when scrolled into view.
 * CSS-only approach — no animation library needed.
 */
export function AnimatedCounter({
  value,
  className = '',
  suffix = '',
}: {
  value: number | string;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(String(value));
  const numericValue = typeof value === 'number' ? value : parseInt(value, 10);

  useEffect(() => {
    const el = ref.current;
    if (!el || isNaN(numericValue)) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplay(String(numericValue));
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          observer.unobserve(el);
          const duration = 600;
          const start = performance.now();

          const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(String(Math.round(eased * numericValue)));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [numericValue]);

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  );
}
