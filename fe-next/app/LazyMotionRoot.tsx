'use client';

import { LazyMotion, domMax } from 'framer-motion';
import type { ReactNode } from 'react';

// domMax, not domAnimation: drag and layout/layoutId are used across the tree.
export function LazyMotionRoot({ children }: { children: ReactNode }) {
  return <LazyMotion features={domMax}>{children}</LazyMotion>;
}
