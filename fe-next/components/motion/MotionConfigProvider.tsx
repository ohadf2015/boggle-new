'use client';

/**
 * MotionConfigProvider - Connects Framer Motion to accessibility settings
 *
 * This component wraps the app with Framer Motion's MotionConfig to respect
 * the user's reduce motion preference (both system and manual).
 *
 * WCAG 2.1 AA requires respecting prefers-reduced-motion.
 */

import React, { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { useAccessibility } from '@/contexts/AccessibilityContext';

interface MotionConfigProviderProps {
  children: ReactNode;
}

export function MotionConfigProvider({ children }: MotionConfigProviderProps) {
  const { shouldReduceMotion } = useAccessibility();

  return (
    <MotionConfig reducedMotion={shouldReduceMotion ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
}

export default MotionConfigProvider;
