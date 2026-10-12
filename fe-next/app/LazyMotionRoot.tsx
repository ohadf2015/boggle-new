'use client';

import { LazyMotion, domAnimation, type FeatureBundle } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';

// Drag and layout features arrive after hydration; swapping `features` re-renders every `m` so mounted elements pick them up.
export function LazyMotionRoot({ children }: { children: ReactNode }) {
  const [features, setFeatures] = useState<FeatureBundle>(domAnimation);
  useEffect(() => {
    let live = true;
    import('./motionMaxFeatures').then((mod) => { if (live) setFeatures(mod.default); });
    return () => { live = false; };
  }, []);
  return <LazyMotion features={features}>{children}</LazyMotion>;
}
