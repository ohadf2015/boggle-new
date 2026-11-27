'use client';

import type { ComponentProps } from 'react';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { useSkipAnimations } from './AdaptiveMotion';

export type CountUpProps = Omit<ComponentProps<typeof AnimatedCounter>, 'previousValue'> & {
  from?: number;
};

export function CountUp({ from = 0, ...props }: CountUpProps) {
  const skip = useSkipAnimations();
  return <AnimatedCounter previousValue={skip ? props.value : from} {...props} />;
}
