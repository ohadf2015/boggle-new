'use client';

import { memo, useEffect, useMemo, useState } from 'react';
import { frameCamera } from '@/lib/wordTowerV2/camera';
import { type SkylineBuilding, buildSkyline } from '@/lib/wordTowerV2/scenery';

/**
 * v2-only scenery drawn IN FRONT of v1's soft sky (v1's layers stay untouched —
 * public /word-tower ships them). Brand is hard-edged neo-brutalist, so these
 * are flat shapes with solid edges, not more gradients:
 *
 * - a slow party sunburst behind the tower (Jackbox energy, fills the centre),
 * - a two-depth neon skyline standing on the ground line that sinks away as the
 *   camera climbs, so the start of a run is a city and not an empty blue sky,
 * - the brand halftone texture over everything.
 */

const LIT = ['#BFFF00', '#FF4D9D', '#37E0FF'];

function useViewport() {
  const [vp, setVp] = useState({ w: 390, h: 844 });
  useEffect(() => {
    const read = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    read();
    window.addEventListener('resize', read);
    return () => window.removeEventListener('resize', read);
  }, []);
  return vp;
}

function Skyline({ buildings, fill, edge, windowAlpha, height }: {
  buildings: SkylineBuilding[];
  fill: string;
  edge: string;
  windowAlpha: number;
  height: number;
}) {
  const width = buildings.reduce((s, b) => s + b.w, 0);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" aria-hidden>
      {buildings.map((b) => {
        const top = height - b.h;
        return (
          <g key={b.x} transform={`translate(${b.x} ${top})`}>
            {b.roof === 'antenna' ? (
              <>
                <rect x={b.w / 2 - 1.5} y={-26} width={3} height={26} fill={fill} />
                <circle cx={b.w / 2} cy={-27} r={3.5} fill="#FF3366" className="wt2-blink" />
              </>
            ) : null}
            {b.roof === 'tank' ? <rect x={8} y={-14} width={20} height={14} fill={fill} stroke={edge} strokeWidth={2} /> : null}
            <rect width={b.w} height={b.h + 4} fill={fill} stroke={edge} strokeWidth={3} />
            {b.windows.map((w, i) =>
              w.lit >= 0 ? (
                <rect key={i} x={w.x} y={w.y} width={w.w} height={w.h} fill={LIT[w.lit]} opacity={windowAlpha} />
              ) : null,
            )}
          </g>
        );
      })}
    </svg>
  );
}

export const V2Scenery = memo(function V2Scenery({
  heightM,
  groundInsetPx,
  accentHex,
  reducedMotion,
}: {
  heightM: number;
  groundInsetPx: number;
  accentHex: string;
  reducedMotion: boolean;
}) {
  const vp = useViewport();
  const width = vp.w + 120;
  const far = useMemo(() => buildSkyline(41, width, 90, 210), [width]);
  const near = useMemo(() => buildSkyline(7, width, 44, 130), [width]);

  // Same framing the Pixi canvas uses, so the city sinks WITH the ground.
  const { cameraY, groundScreenY } = frameCamera({
    viewportW: vp.w,
    viewportH: vp.h,
    dockPx: groundInsetPx,
    towerTopM: heightM,
  });
  // Beyond the true pan, the city drops away with altitude ("the ground falls
  // away"), so by ~10m it is gone and the sky biomes own the screen.
  const fall = Math.min(heightM, 14) * 26;
  const glide = reducedMotion ? undefined : 'transform 700ms cubic-bezier(0.16, 1, 0.3, 1)';

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Sunburst: hard-stop conic rays, radially masked so they fade before
          the edges. Tinted by the current biome's block colour. */}
      <div
        className={reducedMotion ? 'absolute' : 'absolute wt2-spin'}
        style={{
          left: '50%',
          top: groundScreenY * 0.55,
          width: '220vmax',
          height: '220vmax',
          marginLeft: '-110vmax',
          marginTop: '-110vmax',
          background: `repeating-conic-gradient(from 0deg, ${accentHex} 0deg 7deg, transparent 7deg 20deg)`,
          opacity: 0.13,
          maskImage: 'radial-gradient(circle, black 0%, black 12%, transparent 38%)',
          WebkitMaskImage: 'radial-gradient(circle, black 0%, black 12%, transparent 38%)',
        }}
      />

      {/* Far skyline: lighter, dimmer windows, slower parallax. */}
      <div
        className="absolute -start-[60px]"
        style={{ top: groundScreenY - 210, transform: `translateY(${cameraY * 0.55 + fall * 0.7}px)`, transition: glide }}
      >
        <Skyline buildings={far} fill="#2a2f5a" edge="#2a2f5a" windowAlpha={0.22} height={210} />
      </div>

      {/* Near skyline: dark ink-edged silhouettes, neon windows. */}
      <div
        className="absolute -start-[60px]"
        style={{ top: groundScreenY - 130, transform: `translateY(${cameraY + fall}px)`, transition: glide }}
      >
        <Skyline buildings={near} fill="#141830" edge="#0b0e1c" windowAlpha={0.85} height={130} />
      </div>

      <div className="texture-halftone absolute inset-0 opacity-40" />

      <style>{`
        @keyframes wt2-spin { to { transform: rotate(360deg); } }
        .wt2-spin { animation: wt2-spin 120s linear infinite; }
        @keyframes wt2-blink { 0%, 60% { opacity: 1; } 61%, 100% { opacity: 0.15; } }
        .wt2-blink { animation: wt2-blink 1.6s steps(1) infinite; }
        @media (prefers-reduced-motion: reduce) { .wt2-spin, .wt2-blink { animation: none; } }
      `}</style>
    </div>
  );
});
