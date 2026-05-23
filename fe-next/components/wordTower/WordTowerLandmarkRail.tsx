'use client';

import { useEffect, useRef, useState } from 'react';
import { visibleLandmarks } from '@/lib/wordTower/landmarks';
import { PROP_PX_PER_M } from '@/lib/wordTower/parallaxProps';

/** Build line as a fraction of viewport height — matches towerLayout's topCenter. */
const BUILD_LINE_FRACTION = 0.28;
const LINE_FLOW = 'top 900ms cubic-bezier(0.22,1,0.36,1)';

interface Props {
  /** Viewer's current altitude (m). */
  viewerHeightM: number;
  reducedMotion?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Faint world reference lines (skyscraper height, cloud base, jet stream, the
 * edge of space…) on the parallax altitude scale, so the climb gains a real
 * sense of place — you literally rise past the clouds and into orbit. Inert +
 * reduced-motion safe; sits behind the tower and HUD.
 */
export function WordTowerLandmarkRail({ viewerHeightM, reducedMotion, t }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [h, setH] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setH(el.clientHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const buildLineY = h * BUILD_LINE_FRACTION;
  const marks = h > 0 ? visibleLandmarks(viewerHeightM, buildLineY, h, PROP_PX_PER_M) : [];

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {marks.map((m) => (
        <div
          key={m.id}
          className="absolute inset-x-0 flex items-center gap-2 px-3"
          style={{ top: m.screenY, transition: reducedMotion ? 'none' : LINE_FLOW }}
        >
          <span className="whitespace-nowrap rounded-neo border-neo border-black bg-neo-navy/55 px-1.5 py-0.5 font-neo-body text-[10px] font-bold text-neo-white/85 backdrop-blur-sm">
            {m.icon} {t(m.key)} · {m.m}m
          </span>
          <span className="h-px flex-1 bg-[repeating-linear-gradient(90deg,rgba(255,255,255,0.22)_0_8px,transparent_8px_16px)]" />
        </div>
      ))}
    </div>
  );
}
