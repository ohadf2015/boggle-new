'use client';
import { useScrollReveal } from '@/lib/animation/useScrollReveal';

interface Props {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wraps any section with scroll-reveal entrance animation.
 * Respects prefers-reduced-motion automatically via useScrollReveal.
 */
export function ScrollRevealSection({ children, className = '' }: Props) {
  const [ref, visible] = useScrollReveal<HTMLDivElement>({ once: true });

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      } ${className}`}
    >
      {children}
    </div>
  );
}
