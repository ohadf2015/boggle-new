'use client';

/**
 * ClickSpark — CSS particle burst on click
 *
 * Wraps children and intercepts pointer clicks to spawn tiny circular
 * particles that radiate outward and fade. Uses CSS custom properties
 * (--spark-tx / --spark-ty) to parameterise direction per-particle,
 * avoiding the need for N unique @keyframes.
 *
 * Zero external dependencies. Respects prefers-reduced-motion.
 * Particles are appended to the container and self-remove via animationend.
 */

import { useRef, useCallback, useEffect, type ReactNode } from 'react';

// Injected once — keyframe lives in a <style> tag to avoid conflicts with
// Tailwind's purge and to keep the component self-contained.
const SPARK_CSS = `
@keyframes clickSparkRadiate {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--spark-tx), var(--spark-ty)) scale(0); opacity: 0; }
}
`;

// Neo-brutalist palette defaults — vivid, high-contrast
const DEFAULT_COLORS = ['#FFE135', '#FF6B35', '#00FFFF', '#FF1493', '#a855f7'];

interface ClickSparkProps {
  children: ReactNode;
  /** Number of spark particles emitted per click */
  count?: number;
  /** Particle colours; cycles if fewer than count */
  colors?: string[];
  /** Max radial spread from click point (px) */
  spread?: number;
  /** Particle animation duration (ms) */
  duration?: number;
  className?: string;
}

export function ClickSpark({
  children,
  count = 8,
  colors = DEFAULT_COLORS,
  spread = 60,
  duration = 600,
  className = '',
}: ClickSparkProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (reducedMotionRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const tx = Math.cos(angle) * spread;
        const ty = Math.sin(angle) * spread;

        const particle = document.createElement('span');
        particle.style.cssText = [
          'position:absolute',
          `left:${x}px`,
          `top:${y}px`,
          'width:6px',
          'height:6px',
          'border-radius:50%',
          'pointer-events:none',
          `background:${colors[i % colors.length]}`,
          `--spark-tx:${tx}px`,
          `--spark-ty:${ty}px`,
          `animation:clickSparkRadiate ${duration}ms ease-out forwards`,
        ].join(';');

        container.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove(), { once: true });
      }
    },
    [count, colors, spread, duration],
  );

  return (
    <>
      <style>{SPARK_CSS}</style>
      <div
        ref={containerRef}
        data-testid="spark-container"
        className={`relative overflow-hidden ${className}`}
        onClick={handleClick}
      >
        {children}
      </div>
    </>
  );
}
