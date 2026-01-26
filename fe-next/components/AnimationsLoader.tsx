'use client';

import { useEffect } from 'react';

/**
 * AnimationsLoader - Defers loading of animations.css (60KB)
 *
 * Loads animation keyframes after page mount to prioritize critical content.
 * Uses dynamic import to split animations from main CSS bundle.
 *
 * Performance impact:
 * - Saves 60KB on initial page load
 * - Animations load after First Contentful Paint
 * - No visual impact (animations only used for decorative effects)
 */
export default function AnimationsLoader() {
  useEffect(() => {
    // Import animations.css dynamically after page loads
    import('../app/animations.css');
  }, []);

  return null; // This component doesn't render anything
}
