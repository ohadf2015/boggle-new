'use client';

/**
 * AdaptiveMotion - Performance-aware motion components
 *
 * Wraps framer-motion components to conditionally skip animations
 * on low-end devices for better mobile performance.
 *
 * Usage:
 * import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';
 *
 * <AdaptiveMotion.div
 *   initial={{ opacity: 0 }}
 *   animate={{ opacity: 1 }}
 * >
 *   Content
 * </AdaptiveMotion.div>
 */

import React, { memo, useMemo, createContext, useContext, ReactNode } from 'react';
import { motion, AnimatePresence, HTMLMotionProps, MotionProps } from 'framer-motion';
import { getPerformanceConfig } from '@/components/grid/performanceUtils';

// Context to allow overriding animation behavior
interface MotionContextValue {
  skipAnimations: boolean;
}

const MotionContext = createContext<MotionContextValue>({ skipAnimations: false });

export function useSkipAnimations(): boolean {
  const context = useContext(MotionContext);
  const config = useMemo(() => getPerformanceConfig(), []);
  // Skip if either context says so, or device is low-end
  return context.skipAnimations || config.isLowEnd || !config.enableComplexAnimations;
}

/**
 * Provider to force skip animations in a subtree
 */
export function SkipAnimationsProvider({ children, skip = true }: { children: ReactNode; skip?: boolean }) {
  const value = useMemo(() => ({ skipAnimations: skip }), [skip]);
  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}

// Props interface for adaptive motion components
interface AdaptiveMotionProps extends MotionProps {
  skipAnimation?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  onClick?: React.MouseEventHandler;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Type for creating adaptive motion components
type AdaptiveMotionComponent = React.FC<AdaptiveMotionProps>;

/**
 * Creates an adaptive motion component that falls back to a static element on low-end devices
 */
function createAdaptiveComponent(
  element: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  MotionComponent: any
): AdaptiveMotionComponent {
  const AdaptiveComponent: AdaptiveMotionComponent = memo((props: AdaptiveMotionProps) => {
    const {
      skipAnimation,
      initial,
      animate,
      exit,
      transition,
      whileHover,
      whileTap,
      whileFocus,
      whileDrag,
      whileInView,
      layout,
      layoutId,
      ...restProps
    } = props;

    const shouldSkip = useSkipAnimations();

    // If animations should be skipped, render static element
    if (shouldSkip || skipAnimation) {
      // Extract only valid HTML attributes for static element
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const Element = element as any;
      return <Element {...restProps} />;
    }

    // Render full motion component
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Component = MotionComponent as any;
    return (
      <Component
        initial={initial}
        animate={animate}
        exit={exit}
        transition={transition}
        whileHover={whileHover}
        whileTap={whileTap}
        whileFocus={whileFocus}
        whileDrag={whileDrag}
        whileInView={whileInView}
        layout={layout}
        layoutId={layoutId}
        {...restProps}
      />
    );
  });

  AdaptiveComponent.displayName = `AdaptiveMotion.${element}`;
  return AdaptiveComponent;
}

/**
 * AdaptiveMotion - Drop-in replacement for motion that skips animations on low-end devices
 *
 * @example
 * // Before:
 * <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *
 * // After:
 * <AdaptiveMotion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 */
export const AdaptiveMotion = {
  div: createAdaptiveComponent('div', motion.div),
  span: createAdaptiveComponent('span', motion.span),
  button: createAdaptiveComponent('button', motion.button),
  li: createAdaptiveComponent('li', motion.li),
  ul: createAdaptiveComponent('ul', motion.ul),
  p: createAdaptiveComponent('p', motion.p),
  h1: createAdaptiveComponent('h1', motion.h1),
  h2: createAdaptiveComponent('h2', motion.h2),
  h3: createAdaptiveComponent('h3', motion.h3),
  img: createAdaptiveComponent('img', motion.img),
  a: createAdaptiveComponent('a', motion.a),
  nav: createAdaptiveComponent('nav', motion.nav),
  section: createAdaptiveComponent('section', motion.section),
  article: createAdaptiveComponent('article', motion.article),
  aside: createAdaptiveComponent('aside', motion.aside),
  header: createAdaptiveComponent('header', motion.header),
  footer: createAdaptiveComponent('footer', motion.footer),
  main: createAdaptiveComponent('main', motion.main),
  form: createAdaptiveComponent('form', motion.form),
  input: createAdaptiveComponent('input', motion.input),
  label: createAdaptiveComponent('label', motion.label),
  svg: createAdaptiveComponent('svg', motion.svg),
  path: createAdaptiveComponent('path', motion.path),
};

/**
 * AdaptiveAnimatePresence - Wrapper around AnimatePresence that renders children
 * directly (without exit animations) on low-end devices
 */
export const AdaptiveAnimatePresence: React.FC<{
  children: ReactNode;
  mode?: 'sync' | 'wait' | 'popLayout';
  initial?: boolean;
  onExitComplete?: () => void;
}> = memo(({ children, mode, initial, onExitComplete }) => {
  const shouldSkip = useSkipAnimations();

  if (shouldSkip) {
    // On low-end devices, just render children without AnimatePresence overhead
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode={mode} initial={initial} onExitComplete={onExitComplete}>
      {children}
    </AnimatePresence>
  );
});

AdaptiveAnimatePresence.displayName = 'AdaptiveAnimatePresence';

export default AdaptiveMotion;
