'use client';

import { useRef, useCallback, useEffect, type ReactNode } from 'react';

const clickSparkCSS = `
@keyframes clickSparkRadiate {
  0% { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--spark-tx), var(--spark-ty)) scale(0); opacity: 0; }
}
`;

interface ClickSparkProps {
  children: ReactNode;
  /** Number of spark particles per click (default 8) */
  count?: number;
  /** Array of particle colors — defaults to LexiClash neon palette */
  colors?: string[];
  /** Spread radius of particles in pixels (default 50) */
  spread?: number;
  /** Animation duration in milliseconds (default 500) */
  duration?: number;
  className?: string;
}

/**
 * ClickSpark — Wraps children with a click-triggered particle burst.
 * Pure CSS animation, no external deps, respects prefers-reduced-motion.
 *
 * Inspired by animate-ai's reactbits-click-spark pattern.
 */
export function ClickSpark({
  children,
  count = 8,
  colors = ['#BFFF00', '#00FFFF', '#FF1493', '#FFE135', '#a855f7'],
  spread = 50,
  duration = 500,
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
        particle.style.cssText = `
          position: absolute;
          left: ${x}px;
          top: ${y}px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 50;
          background: ${colors[i % colors.length]};
          --spark-tx: ${tx}px;
          --spark-ty: ${ty}px;
          animation: clickSparkRadiate ${duration}ms ease-out forwards;
        `;

        container.appendChild(particle);
        particle.addEventListener('animationend', () => particle.remove());
      }
    },
    [count, colors, spread, duration],
  );

  return (
    <>
      <style>{clickSparkCSS}</style>
      <div
        ref={containerRef}
        className={`relative overflow-visible ${className}`}
        onClick={handleClick}
      >
        {children}
      </div>
    </>
  );
}

export default ClickSpark;
