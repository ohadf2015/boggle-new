'use client';

import { useEffect } from 'react';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

/**
 * Mounts the SharedFxApp Pixi singleton once at app root so its consumers
 * (coin-earn streams, level-up celebrations, fireworks, boost FX) actually
 * render. Without this single mount, every `spawn*` call no-ops because
 * `app === null` — the silent regression that left those effects dead in prod.
 *
 * Skips initialization entirely under reduced-motion or a zero particle budget:
 * a GPU context that can only no-op isn't worth the startup cost on those
 * devices, and the consumers already degrade to sound/DOM-only feedback.
 */
export const SharedFxMount: React.FC = () => {
  const { maxParticles, prefersReducedMotion } = useDevicePerformance();

  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (prefersReducedMotion || maxParticles <= 0) return;

    SharedFxApp.mount(document.body, { maxParticles, prefersReducedMotion }).catch(() => {
      // mount is best-effort; a failed GPU init must never break the app shell.
    });

    return () => {
      SharedFxApp.unmount();
    };
  }, [maxParticles, prefersReducedMotion]);

  return null;
};

export default SharedFxMount;
