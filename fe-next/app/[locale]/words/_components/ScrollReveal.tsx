'use client';

import { useRef, useEffect, useState, isValidElement, type ReactNode } from 'react';

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: 'up' | 'left' | 'scale';
}

/**
 * Lightweight scroll-triggered reveal for SEO pages.
 * Uses IntersectionObserver + CSS transitions (no framer-motion bundle).
 * Respects prefers-reduced-motion.
 */
export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  direction = 'up',
}: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const baseStyle: React.CSSProperties = {
    transitionProperty: 'opacity, transform',
    transitionDuration: '0.5s',
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: `${delay}s`,
  };

  const hiddenTransform =
    direction === 'up'
      ? 'translateY(24px)'
      : direction === 'left'
        ? 'translateX(-24px)'
        : 'scale(0.95)';

  const style: React.CSSProperties = visible
    ? { ...baseStyle, opacity: 1, transform: 'none' }
    : { ...baseStyle, opacity: 0, transform: hiddenTransform };

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
}

/**
 * Staggered list reveal — each child animates in sequence.
 */
export function StaggerReveal({
  children,
  className = '',
  staggerMs = 50,
  direction = 'up',
}: {
  children: ReactNode[];
  className?: string;
  staggerMs?: number;
  direction?: 'up' | 'left' | 'scale';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hiddenTransform =
    direction === 'up'
      ? 'translateY(16px)'
      : direction === 'left'
        ? 'translateX(-16px)'
        : 'scale(0.95)';

  return (
    <div ref={ref} className={className}>
      {children.map((child, i) => (
        <div
          key={(isValidElement(child) && child.key) || `stagger-${i}`}
          style={{
            transitionProperty: 'opacity, transform',
            transitionDuration: '0.4s',
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: visible ? `${i * staggerMs}ms` : '0ms',
            opacity: visible ? 1 : 0,
            transform: visible ? 'none' : hiddenTransform,
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
