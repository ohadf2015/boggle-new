'use client';

/**
 * MotionConfigProvider - Connects Framer Motion to accessibility settings
 *
 * This component wraps the app with Framer Motion's MotionConfig to respect
 * the user's reduce motion preference (both system and manual).
 *
 * WCAG 2.1 AA requires respecting prefers-reduced-motion.
 *
 * framer-motion is lazy-imported to avoid forcing Turbopack to compile the
 * entire library on every cold page load (~2-3s dev TTFB penalty).
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface MotionConfigProviderProps {
  children: ReactNode;
}

// Lazy-load MotionConfig to avoid pulling framer-motion into the critical path.
// Children render immediately; once framer-motion loads, MotionConfig wraps them.
let _MotionConfig: React.ComponentType<{ reducedMotion: string; children: ReactNode }> | null = null;
let _loadPromise: Promise<void> | null = null;

function loadMotionConfig(): Promise<void> {
  if (!_loadPromise) {
    _loadPromise = import('framer-motion').then((mod) => {
      _MotionConfig = mod.MotionConfig as React.ComponentType<{ reducedMotion: string; children: ReactNode }>;
    });
  }
  return _loadPromise;
}

export function MotionConfigProvider({ children }: MotionConfigProviderProps) {
  const { shouldReduceMotion } = useAccessibility();
  const [ready, setReady] = useState(!!_MotionConfig);

  useEffect(() => {
    if (!_MotionConfig) {
      loadMotionConfig().then(() => setReady(true));
    }
  }, []);

  if (ready && _MotionConfig) {
    return (
      <_MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
        {children}
      </_MotionConfig>
    );
  }

  // Render children immediately — MotionConfig is a non-visual wrapper,
  // so there's no flash. Animations just won't respect reduce-motion
  // for the ~100ms until framer-motion loads.
  return <>{children}</>;
}

export default MotionConfigProvider;
