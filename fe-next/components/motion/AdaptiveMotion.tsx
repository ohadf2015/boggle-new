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
import { m, AnimatePresence, MotionProps } from 'framer-motion';
import { getPerformanceConfig } from '@/components/grid/performanceUtils';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';

// Context to allow overriding animation behavior
interface MotionContextValue {
  skipAnimations: boolean;
}

const MotionContext = createContext<MotionContextValue>({ skipAnimations: false });

export function useSkipAnimations(): boolean {
  const context = useContext(MotionContext);
  const config = useMemo(() => getPerformanceConfig(), []);
  const shouldReduceMotion = useShouldReduceMotion();
  // Skip if: context says so, device is low-end, or user prefers reduced motion
  return context.skipAnimations || config.isLowEnd || !config.enableComplexAnimations || shouldReduceMotion;
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
  children?: ReactNode;
  onClick?: React.MouseEventHandler;

  [key: string]: unknown;
}

// Type for creating adaptive motion components
type AdaptiveMotionComponent = React.FC<AdaptiveMotionProps>;

/**
 * Static fallback rendered when animations are skipped. Crucially it still
 * invokes onAnimationComplete ONCE on mount — many callers drive their lifecycle
 * off that callback (combo flash, score flies, floating coins dismiss themselves
 * in it). Skipping the animation means it "completes instantly", so firing the
 * callback on mount is the correct semantic; dropping it (the previous behaviour)
 * left those elements stuck on screen forever. onAnimationStart fires first for
 * symmetry. Neither framer handler is forwarded to the DOM element (they would
 * otherwise trigger React "Unknown event handler property" warnings).
 */
const StaticAdaptiveElement: React.FC<{
  element: string;
  onAnimationStart?: () => void;
  onAnimationComplete?: () => void;
  [key: string]: unknown;
}> = ({ element, onAnimationStart, onAnimationComplete, ...rest }) => {
  React.useEffect(() => {
    onAnimationStart?.();
    onAnimationComplete?.();
    // Fire exactly once on mount — a skipped animation is an instantly-complete
    // one. Intentionally no deps; re-firing on prop changes would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const Element = element as React.ElementType;
  return <Element {...rest} />;
};

/**
 * Creates an adaptive motion component that falls back to a static element on low-end devices
 */
function createAdaptiveComponent(
  element: string,
  MotionComponent: React.ComponentType<MotionProps>
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
      // Pulled out of restProps so they are never forwarded to a plain DOM
      // element on the skip path; re-attached explicitly on the motion path.
      onAnimationStart,
      onAnimationComplete,
      ...restProps
    } = props;

    const shouldSkip = useSkipAnimations();

    // If animations should be skipped, render a static element that still
    // honours the animation lifecycle callbacks (see StaticAdaptiveElement).
    if (shouldSkip || skipAnimation) {
      return (
        <StaticAdaptiveElement
          element={element}
          onAnimationStart={onAnimationStart as (() => void) | undefined}
          onAnimationComplete={onAnimationComplete as (() => void) | undefined}
          {...restProps}
        />
      );
    }

    const Component = MotionComponent;
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
        onAnimationStart={onAnimationStart}
        onAnimationComplete={onAnimationComplete}
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
 * <m.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 *
 * // After:
 * <AdaptiveMotion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
 */
export const AdaptiveMotion = {
  div: createAdaptiveComponent('div', m.div),
  span: createAdaptiveComponent('span', m.span),
  button: createAdaptiveComponent('button', m.button),
  li: createAdaptiveComponent('li', m.li),
  ul: createAdaptiveComponent('ul', m.ul),
  p: createAdaptiveComponent('p', m.p),
  h1: createAdaptiveComponent('h1', m.h1),
  h2: createAdaptiveComponent('h2', m.h2),
  h3: createAdaptiveComponent('h3', m.h3),
  img: createAdaptiveComponent('img', m.img),
  a: createAdaptiveComponent('a', m.a),
  nav: createAdaptiveComponent('nav', m.nav),
  section: createAdaptiveComponent('section', m.section),
  article: createAdaptiveComponent('article', m.article),
  aside: createAdaptiveComponent('aside', m.aside),
  header: createAdaptiveComponent('header', m.header),
  footer: createAdaptiveComponent('footer', m.footer),
  main: createAdaptiveComponent('main', m.main),
  form: createAdaptiveComponent('form', m.form),
  input: createAdaptiveComponent('input', m.input),
  label: createAdaptiveComponent('label', m.label),
  svg: createAdaptiveComponent('svg', m.svg),
  path: createAdaptiveComponent('path', m.path),
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
