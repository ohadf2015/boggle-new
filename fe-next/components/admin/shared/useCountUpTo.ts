'use client';

import { useCountUp } from '@/hooks/useCountUp';
import { isReducedMotionPreferred } from '@/utils/accessibility';

/** The admin count-up: a short ease-out, skipped entirely for reduced-motion users. */
export function useCountUpTo(target: number): number {
  return useCountUp({ target, duration: 600, immediate: isReducedMotionPreferred() });
}
