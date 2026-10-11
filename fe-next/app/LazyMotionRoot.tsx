'use client';

import { LazyMotion, domAnimation, type FeatureBundle } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { MotionMaxReadyContext } from '@/components/motion/useMotionMaxReady';

export function LazyMotionRoot({ children }: { children: ReactNode }) {
  const [max, setMax] = useState<FeatureBundle | null>(null);
  useEffect(() => {
    let live = true;
    import('./motionMaxFeatures').then((mod) => { if (live) setMax(mod.default); });
    return () => { live = false; };
  }, []);
  return (
    <LazyMotion features={domAnimation}>
      {max && <LazyMotion features={max}>{null}</LazyMotion>}
      <MotionMaxReadyContext.Provider value={max !== null}>{children}</MotionMaxReadyContext.Provider>
    </LazyMotion>
  );
}
