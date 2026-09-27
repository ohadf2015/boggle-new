'use client';

// ─── NewYearFireworks (bridge) ────────────────────────────────────────
// Thin policy layer over SharedFxApp.spawnFirework. Owns scheduling,
// color rotation, position randomization. Engine draws on shared
// canvas; component renders nothing.

import { memo, useEffect } from 'react';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';

interface NewYearFireworksProps {
  active: boolean;
  count?: number;
  duration?: number;
}

const NEO_COLORS = [0xbfff00, 0xff1493, 0x00ffff, 0x8b5cf6] as const;

const NewYearFireworks = memo(({ active, count = 8, duration = 5000 }: NewYearFireworksProps) => {
  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;

    const w = window.innerWidth;
    const h = window.innerHeight;
    const step = duration / (count * 2);

    for (let i = 0; i < count; i++) {
      SharedFxApp.spawnFirework({
        x: w * (0.2 + Math.random() * 0.6),
        y: h * (0.2 + Math.random() * 0.4),
        color: NEO_COLORS[i % NEO_COLORS.length],
        size: 80 + Math.random() * 60,
        delayMs: i * step,
      });
    }
  }, [active, count, duration]);

  return null;
});

NewYearFireworks.displayName = 'NewYearFireworks';

export default NewYearFireworks;
