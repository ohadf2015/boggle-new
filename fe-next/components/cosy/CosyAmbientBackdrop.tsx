'use client';

import React from 'react';
import { useCosyMode } from '@/contexts/AccessibilityContext';

/**
 * CosyAmbientBackdrop — soothing ambient atmosphere for Cosy / Calm Mode.
 *
 * Cozy used to be *still* (all playful keyframes stripped), which read as dead
 * rather than calm. This layer brings gentle LIFE back without the jarring
 * party motion: two soft, heavily-blurred warm-light blobs that drift and
 * breathe on very long periods (30s+), with tiny travel and low opacity — the
 * eye never chases them; they just make the room feel warm and lived-in.
 *
 * Accessibility: the drift is `animation: none` under `prefers-reduced-motion:
 * reduce` (see globals.css), so anyone with the OS vestibular opt-out gets a
 * perfectly still warm wash. Everyone else gets soothing motion. The layer is
 * purely decorative (aria-hidden, pointer-events-none) and only mounts when
 * cosy is active, so it costs nothing for the loud default.
 */
export const CosyAmbientBackdrop: React.FC = () => {
  const cosyMode = useCosyMode();
  if (!cosyMode) return null;

  return (
    <div
      data-testid="cosy-ambient-backdrop"
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      <span className="cosy-ambient-blob cosy-ambient-blob-a" />
      <span className="cosy-ambient-blob cosy-ambient-blob-b" />
    </div>
  );
};

export default CosyAmbientBackdrop;
