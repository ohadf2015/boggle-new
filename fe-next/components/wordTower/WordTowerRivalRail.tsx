'use client';

import { useEffect, useRef, useState } from 'react';
import { visibleRivalMarkers, rivalsPassed, type RivalMarker } from '@/lib/wordTower/rivals';
import { PROP_PX_PER_M } from '@/lib/wordTower/parallaxProps';

/** Build line as a fraction of viewport height — matches towerLayout's topCenter. */
const BUILD_LINE_FRACTION = 0.28;
const LINE_FLOW = 'top 900ms cubic-bezier(0.22,1,0.36,1)';

interface Props {
  rivals: RivalMarker[];
  /** Viewer's current altitude (m). */
  viewerHeightM: number;
  reducedMotion?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Faint record lines for other players' best heights, placed on the parallax
 * altitude scale so the climber rises past them. Crossing one fires a brief
 * "passed {name}!" cheer — the nudge to overtake. Inert + reduced-motion safe.
 */
export function WordTowerRivalRail({ rivals, viewerHeightM, reducedMotion, t }: Props) {
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

  // "Passed!" cheer when the climb crosses a rival's record.
  const prevHeight = useRef(viewerHeightM);
  const [passed, setPassed] = useState<string | null>(null);
  useEffect(() => {
    const crossed = rivalsPassed(prevHeight.current, viewerHeightM, rivals);
    prevHeight.current = viewerHeightM;
    if (crossed.length === 0) return;
    setPassed(crossed[crossed.length - 1]!.name);
    const id = setTimeout(() => setPassed(null), 1800);
    return () => clearTimeout(id);
  }, [viewerHeightM, rivals]);

  const buildLineY = h * BUILD_LINE_FRACTION;
  const markers = h > 0 ? visibleRivalMarkers(viewerHeightM, rivals, buildLineY, h, PROP_PX_PER_M) : [];

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {markers.map((m, i) => {
        // Alternate edges so multiple rivals don't overlap; a faint block-striped
        // column rises to the record line — "their tower reaches this high".
        const side = i % 2 === 0 ? 'start-1' : 'end-1';
        const colH = Math.min(h, Math.max(90, h - m.screenY));
        return (
          <div
            key={m.id}
            className={`absolute ${side}`}
            style={{ top: m.screenY, transition: reducedMotion ? 'none' : LINE_FLOW }}
          >
            <span className="absolute -top-5 start-0 whitespace-nowrap rounded-neo border-neo border-black bg-neo-navy/70 px-1.5 py-0.5 font-neo-body text-[10px] font-bold text-neo-white backdrop-blur-sm">
              {m.name} · {Math.round(m.heightM)}m
            </span>
            <div
              className="w-5 rounded-t-neo border-x border-t border-neo-white/25"
              style={{
                height: colH,
                opacity: 0.22,
                backgroundColor: 'rgba(255,255,255,0.10)',
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 12px)',
              }}
            />
          </div>
        );
      })}
      {passed && (
        <div className="absolute left-1/2 top-[42%] -translate-x-1/2 animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-1.5 font-neo-display text-sm font-black text-black shadow-hard">
          {t('wordTower.hud.rivalPassed', { name: passed })}
        </div>
      )}
    </div>
  );
}
