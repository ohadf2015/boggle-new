// Noop framer-motion mock — prevents animation rAF loops from leaking into fork teardown.
import React from 'react';

const MOTION_PROPS = new Set([
  'initial', 'animate', 'exit', 'transition', 'variants',
  'whileHover', 'whileTap', 'whileFocus', 'whileInView', 'whileDrag',
  'layout', 'layoutId', 'layoutDependency', 'layoutRoot',
  'onAnimationStart', 'onAnimationComplete', 'onUpdate',
  'onDragStart', 'onDrag', 'onDragEnd', 'onHoverStart', 'onHoverEnd',
  'drag', 'dragConstraints', 'dragElastic', 'dragMomentum',
  'transformTemplate', 'custom',
]);

const createMotionComponent = (tag: string) => {
  const Component = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const domProps: Record<string, unknown> = {};
    for (const key of Object.keys(props)) {
      if (!MOTION_PROPS.has(key)) domProps[key] = props[key];
    }
    return React.createElement(tag, { ...domProps, ref }, children);
  });
  Component.displayName = `motion.${tag}`;
  return Component;
};

const motionProxyHandler: ProxyHandler<object> = {
  get: (_target, tag: string) => createMotionComponent(tag),
};
const motion = new Proxy({} as any, motionProxyHandler);
const m = motion;

const AnimatePresence = ({ children }: { children?: React.ReactNode }) => children as React.ReactElement | null;
const LazyMotion = ({ children }: { children?: React.ReactNode }) => children as React.ReactElement | null;
const LayoutGroup = ({ children }: { children?: React.ReactNode }) => children as React.ReactElement | null;
const MotionConfig = ({ children }: { children?: React.ReactNode }) => children as React.ReactElement | null;

const domAnimation = {};
const domMax = {};

const createMotionValue = (initial: unknown) => ({
  get: () => initial,
  set: () => {},
  on: () => () => {},
  onChange: () => () => {},
  getVelocity: () => 0,
  destroy: () => {},
  subscribe: () => () => {},
  clearListeners: () => {},
  isAnimating: () => false,
  stop: () => {},
});

const useMotionValue = (initial: unknown) => React.useMemo(() => createMotionValue(initial), []);
const useSpring = (source: unknown) => React.useMemo(() => createMotionValue(typeof source === 'object' ? 0 : source), []);
const useTransform = (_value: unknown, _input?: unknown, _output?: unknown) =>
  React.useMemo(() => createMotionValue(0), []);

const useAnimation = () =>
  React.useMemo(() => ({ start: () => Promise.resolve(), stop: () => {}, set: () => {}, mount: () => () => {} }), []);
const useAnimationControls = useAnimation;

const useReducedMotion = () => false;
const useInView = () => false;
const useScroll = () => ({
  scrollX: createMotionValue(0),
  scrollY: createMotionValue(0),
  scrollXProgress: createMotionValue(0),
  scrollYProgress: createMotionValue(0),
});
const useAnimate = () => [React.useRef(null), () => Promise.resolve()] as const;

const animate = (_from: unknown, _to?: unknown, _options?: unknown) => ({
  stop: () => {},
  then: (cb: () => void) => { cb(); return { catch: () => {} }; },
  cancel: () => {},
});

const stagger = (_duration?: number) => 0;

export {
  motion,
  m,
  AnimatePresence,
  LazyMotion,
  LayoutGroup,
  MotionConfig,
  domAnimation,
  domMax,
  useMotionValue,
  useSpring,
  useTransform,
  useAnimation,
  useAnimationControls,
  useReducedMotion,
  useInView,
  useScroll,
  useAnimate,
  animate,
  stagger,
};
export default motion;
