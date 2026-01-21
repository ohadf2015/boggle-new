'use client';

import { useState, useEffect } from 'react';

export type PerformanceTier = 'high' | 'medium' | 'low';

interface PerformanceMetrics {
  tier: PerformanceTier;
  devicePixelRatio: number;
  hardwareConcurrency: number;
  hasWebGL2: boolean;
}

/**
 * Detect device performance capability for adaptive 3D rendering quality
 *
 * Checks:
 * - Hardware concurrency (CPU cores)
 * - Device pixel ratio (screen density)
 * - WebGL2 support
 * - Device memory (if available)
 *
 * Returns 'high', 'medium', or 'low' tier for quality adjustments
 */
export function usePerformanceTier(): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    tier: 'medium', // Safe default
    devicePixelRatio: 1,
    hardwareConcurrency: 4,
    hasWebGL2: true,
  });

  useEffect(() => {
    const detectPerformance = (): PerformanceMetrics => {
      // Get hardware concurrency (CPU cores)
      const hardwareConcurrency = navigator.hardwareConcurrency || 4;

      // Get device pixel ratio
      const devicePixelRatio = window.devicePixelRatio || 1;

      // Check WebGL2 support
      let hasWebGL2 = false;
      try {
        const canvas = document.createElement('canvas');
        hasWebGL2 = !!(canvas.getContext('webgl2'));
      } catch {
        hasWebGL2 = false;
      }

      // Get device memory (Chrome only)
      const deviceMemory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;

      // Check if mobile device
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );

      // Calculate tier based on metrics
      let tier: PerformanceTier = 'medium';

      // High tier: Powerful desktop/laptop
      if (
        hardwareConcurrency >= 8 &&
        deviceMemory >= 8 &&
        hasWebGL2 &&
        !isMobile
      ) {
        tier = 'high';
      }
      // Low tier: Weak device or mobile with limited resources
      else if (
        hardwareConcurrency <= 2 ||
        deviceMemory <= 2 ||
        !hasWebGL2 ||
        (isMobile && hardwareConcurrency <= 4)
      ) {
        tier = 'low';
      }
      // Medium tier: Everything else

      return {
        tier,
        devicePixelRatio,
        hardwareConcurrency,
        hasWebGL2,
      };
    };

    setMetrics(detectPerformance());
  }, []);

  return metrics;
}

/**
 * Get recommended settings based on performance tier
 */
export function getQualitySettings(tier: PerformanceTier) {
  switch (tier) {
    case 'high':
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 2),
        shadows: true,
        postProcessing: true,
        particleCount: 100,
        cloudCount: 15,
        decorationCount: 8,
        antialias: true,
      };
    case 'medium':
      return {
        pixelRatio: Math.min(window.devicePixelRatio, 1.5),
        shadows: false,
        postProcessing: true,
        particleCount: 50,
        cloudCount: 8,
        decorationCount: 5,
        antialias: true,
      };
    case 'low':
      return {
        pixelRatio: 1,
        shadows: false,
        postProcessing: false,
        particleCount: 20,
        cloudCount: 4,
        decorationCount: 3,
        antialias: false,
      };
  }
}
