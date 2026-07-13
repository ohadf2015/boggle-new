'use client';

import { useEffect, useRef, useState } from 'react';
import { railRivals, rivalsPassed, type RivalMarker } from '@/lib/wordTower/rivals';
import { blockMaterial } from '@/lib/wordTower/blockGrade';
import { PROP_PX_PER_M } from '@/lib/wordTower/parallaxProps';
import Avatar from '@/components/Avatar';
import { useAutoDismiss } from './useAutoDismiss';
import { WORD_TOWER_BUILD_LINE_FRACTION as BUILD_LINE_FRACTION } from '@/lib/wordTower/towerLayout';
const LINE_FLOW = 'top 900ms cubic-bezier(0.22,1,0.36,1)';
/** How long the "passed!" cheer stays up before it auto-dismisses. */
const PASS_TOAST_MS = 2000;

const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;

interface Props {
  rivals: RivalMarker[];
  /** Viewer's current altitude (m). */
  viewerHeightM: number;
  reducedMotion?: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * Other players' towers rendered as themed ghost columns on the parallax altitude
 * scale — tinted with the material of the highest zone THEY reached (concrete →
 * gunmetal → obsidian) + an avatar chip, so "their building" reads as a real
 * tower you rise past. Crossing one fires a brief "passed {name}!" celebration.
 * Inert + reduced-motion safe.
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

  // Detect crossings only — NO dismiss timer here. (A timer in this effect would be
  // cancelled by the cleanup on every height change, so the toast would never clear.)
  const prevHeight = useRef(viewerHeightM);
  const [passed, setPassed] = useState<string | null>(null);
  useEffect(() => {
    const crossed = rivalsPassed(prevHeight.current, viewerHeightM, rivals);
    prevHeight.current = viewerHeightM;
    if (crossed.length > 0) setPassed(crossed[crossed.length - 1]!.name);
  }, [viewerHeightM, rivals]);

  // Auto-dismiss via the shared hook (rAF watchdog + visibilitychange recovery)
  // so the "passed!" cheer can't strand on screen the way a bare setTimeout can.
  useAutoDismiss(passed, () => setPassed(null), PASS_TOAST_MS);

  const buildLineY = h * BUILD_LINE_FRACTION;
  // Every rival, always drawn + clamped so none sits below our tower top (#2).
  const markers = h > 0 ? railRivals(viewerHeightM, rivals, buildLineY, PROP_PX_PER_M) : [];

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {markers.map((m, i) => {
        // Alternate edges so multiple rivals don't overlap; a tinted block-striped
        // column rises to the record line — "their tower reaches this high".
        const side = i % 2 === 0 ? 'start-1' : 'end-1';
        const colH = Math.min(h, Math.max(90, h - m.screenY));
        const mat = hex(blockMaterial(m.highestBiome ?? 'city'));
        return (
          <div
            key={m.id}
            className={`absolute ${side}`}
            style={{ top: m.screenY, transition: reducedMotion ? 'none' : LINE_FLOW }}
          >
            <span className="absolute -top-7 start-0 flex items-center gap-1.5 whitespace-nowrap rounded-neo border-neo border-black bg-neo-navy/75 px-1.5 py-0.5 font-neo-body text-[10px] font-bold text-neo-white backdrop-blur-sm">
              {/* The rival's REAL avatar (their generated identity face), not a flat
                  emoji — seeded fallback from playerId when they have no custom one. */}
              <Avatar
                customAvatar={m.customAvatar ?? undefined}
                userId={m.playerId ?? m.id}
                pixelSize={20}
                disableEffects
                className="shrink-0 rounded-full border border-black"
              />
              {m.name} · {Math.round(m.heightM)}m
              {m.pinnedAbove && (
                <span className="rounded-sm bg-neo-cyan px-1 text-[9px] font-black text-black">↑ +{m.gapM}m</span>
              )}
            </span>
            {/* Roof cap — the rival tower's crown at their record height. */}
            <div className="h-1.5 w-5 rounded-t-neo border border-black" style={{ background: mat }} />
            <div
              className="w-5 border-x border-black/50"
              style={{
                height: colH,
                opacity: 0.5,
                backgroundColor: mat,
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(0,0,0,0.32) 0 1px, transparent 1px 11px), repeating-linear-gradient(0deg, rgba(255,255,255,0.16) 2px 4px, transparent 4px 12px)',
              }}
            />
          </div>
        );
      })}
      {passed && (
        // Pinned high under the HUD — NOT over the build column (was top-[42%], which
        // covered the tower letters).
        <div className="absolute left-1/2 top-[15%] -translate-x-1/2 animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-yellow px-3 py-1.5 font-neo-display text-sm font-black text-black shadow-hard">
          🎉 {t('wordTower.hud.rivalPassed', { name: passed })}
        </div>
      )}
    </div>
  );
}
