'use client';

import React, { ReactNode } from 'react';
import { m, AnimatePresence, Variants } from 'framer-motion';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { cn } from '@/lib/utils';

type TransitionType = 'fade' | 'slide' | 'scale' | 'slideUp' | 'slideDown' | 'neo';

interface PageTransitionProps {
  /** Unique key for the page (usually pathname) */
  pageKey: string;
  /** Transition type */
  type?: TransitionType;
  /** Animation duration in seconds */
  duration?: number;
  /** Children to animate */
  children: ReactNode;
  /** Additional className */
  className?: string;
  /** Disable animation */
  disabled?: boolean;
}

// Transition variants
const transitions: Record<TransitionType, Variants> = {
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slide: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  },
  scale: {
    initial: { scale: 0.95, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.05, opacity: 0 },
  },
  slideUp: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  },
  slideDown: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  },
  neo: {
    initial: { x: 10, y: 10, opacity: 0, scale: 0.98 },
    animate: { x: 0, y: 0, opacity: 1, scale: 1 },
    exit: { x: -10, y: -10, opacity: 0, scale: 0.98 },
  },
};

/**
 * PageTransition - Wrapper for page/route transitions
 *
 * Provides smooth animated transitions between pages or views.
 * Automatically respects reduced motion preferences.
 *
 * @example
 * ```tsx
 * // In a layout or page wrapper
 * <PageTransition pageKey={pathname} type="neo">
 *   <PageContent />
 * </PageTransition>
 *
 * // Or with Next.js App Router
 * export default function Layout({ children }) {
 *   const pathname = usePathname();
 *   return (
 *     <PageTransition pageKey={pathname} type="slideUp">
 *       {children}
 *     </PageTransition>
 *   );
 * }
 * ```
 */
export function PageTransition({
  pageKey,
  type = 'fade',
  duration = 0.3,
  children,
  className,
  disabled = false,
}: PageTransitionProps) {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  // Skip animation if disabled or reduced motion
  if (disabled || prefersReducedMotion || isLowEnd) {
    return <div className={className}>{children}</div>;
  }

  const variants = transitions[type];

  return (
    <AnimatePresence mode="wait">
      <m.div
        key={pageKey}
        className={className}
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{
          duration,
          ease: [0.25, 0.1, 0.25, 1],
        }}
      >
        {children}
      </m.div>
    </AnimatePresence>
  );
}

/**
 * MotionContainer - Container with entrance animation for lists/grids
 *
 * Staggers child animations for a pleasing cascade effect.
 *
 * @example
 * ```tsx
 * <MotionContainer stagger={0.05}>
 *   {items.map((item) => (
 *     <MotionItem key={item.id}>
 *       <Card {...item} />
 *     </MotionItem>
 *   ))}
 * </MotionContainer>
 * ```
 */
export function MotionContainer({
  children,
  stagger = 0.05,
  className,
  disabled = false,
}: {
  children: ReactNode;
  stagger?: number;
  className?: string;
  disabled?: boolean;
}) {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  if (disabled || prefersReducedMotion || isLowEnd) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: stagger,
          },
        },
      }}
    >
      {children}
    </m.div>
  );
}

/**
 * MotionItem - Individual item for staggered animation
 */
export function MotionItem({
  children,
  type = 'fadeUp',
  className,
}: {
  children: ReactNode;
  type?: 'fadeUp' | 'fadeIn' | 'scaleIn' | 'slideIn';
  className?: string;
}) {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  if (prefersReducedMotion || isLowEnd) {
    return <div className={className}>{children}</div>;
  }

  const itemVariants: Record<string, Variants> = {
    fadeUp: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 },
    },
    scaleIn: {
      hidden: { opacity: 0, scale: 0.9 },
      visible: { opacity: 1, scale: 1 },
    },
    slideIn: {
      hidden: { opacity: 0, x: -20 },
      visible: { opacity: 1, x: 0 },
    },
  };

  return (
    <m.div
      className={className}
      variants={itemVariants[type]}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {children}
    </m.div>
  );
}

/**
 * FadeIn - Simple fade-in wrapper with optional delay
 */
export function FadeIn({
  children,
  delay = 0,
  duration = 0.3,
  className,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const { prefersReducedMotion, isLowEnd } = useDevicePerformance();

  if (prefersReducedMotion || isLowEnd) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
    >
      {children}
    </m.div>
  );
}

/**
 * ScaleOnHover - Wrapper that scales on hover/tap
 */
export function ScaleOnHover({
  children,
  scale = 1.05,
  className,
}: {
  children: ReactNode;
  scale?: number;
  className?: string;
}) {
  const { prefersReducedMotion } = useDevicePerformance();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <m.div
      className={cn('cursor-pointer', className)}
      whileHover={{ scale }}
      whileTap={{ scale: scale * 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      {children}
    </m.div>
  );
}

export default PageTransition;
