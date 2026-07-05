'use client';

import { useEffect, useRef, useState } from 'react';
import { pickSighting, SIGHTING_ASSET, type SightingKind } from '@/lib/wordTower/skySightings';

/**
 * Word Tower — rare drifting sky sightings (pure spectacle).
 *
 * Every few seconds at altitude this rolls for a sighting (cosmic whale,
 * satellite glint, shooting star) and, on a hit, drifts ONE across the upper
 * sky, then retires it. Awe / mystery, not cute — only the brand mascot is
 * kawaii. Purely cosmetic DOM overlay: never touches score, so the roll is a
 * free `Math.random()` and the leaderboard is blind to it. Off entirely under
 * reduced-motion (it is motion spectacle).
 */

const ROLL_INTERVAL_MS = 4800;
// Calmer, longer glide (was a brisk 9s straight line that read mechanical).
const DRIFT_MS = 13000;

interface ActiveSighting {
  id: number;
  kind: SightingKind;
  topPct: number;
  rightward: boolean;
}

export function WordTowerSighting({
  heightM = 0,
  reducedMotion = false,
}: {
  heightM?: number;
  reducedMotion?: boolean;
}) {
  const [sighting, setSighting] = useState<ActiveSighting | null>(null);
  const [drifting, setDrifting] = useState(false);
  const idRef = useRef(0);
  const altRef = useRef(heightM);
  altRef.current = heightM;

  // Periodically roll for a new sighting while none is on screen.
  useEffect(() => {
    if (reducedMotion) return;
    const tick = window.setInterval(() => {
      setSighting((cur) => {
        if (cur) return cur; // one at a time
        const kind = pickSighting(Math.random(), altRef.current);
        if (!kind) return null;
        return {
          id: ++idRef.current,
          kind,
          topPct: 8 + Math.random() * 30, // upper sky band
          rightward: Math.random() < 0.5,
        };
      });
    }, ROLL_INTERVAL_MS);
    return () => window.clearInterval(tick);
  }, [reducedMotion]);

  // On a new sighting: start off-screen, flip to drift next frame (CSS
  // transition animates the cross), then retire after the drift completes.
  useEffect(() => {
    if (!sighting) return;
    setDrifting(false);
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setDrifting(true)));
    const done = window.setTimeout(() => setSighting(null), DRIFT_MS + 200);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
    };
  }, [sighting]);

  if (reducedMotion || !sighting) return null;

  const { kind, topPct, rightward } = sighting;
  const startX = rightward ? '-24vw' : '120vw';
  const endX = rightward ? '120vw' : '-24vw';
  const faceFlip = rightward ? 1 : -1; // whale faces its travel direction

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* Gentle swim bob + soft edge fade so the drift reads alive, not like a
          sprite sliding on a rail (founder: sightings looked "weird"). The X
          drift stays steady (translate transition); a nested layer adds the
          vertical bob, and opacity fades in/out at the screen edges. */}
      <style>{`
        @keyframes wt-sighting-bob { 0%,100% { transform: translateY(-7px) rotate(-1.5deg); } 50% { transform: translateY(7px) rotate(1.5deg); } }
        @keyframes wt-sighting-fade { 0% { opacity: 0; } 14% { opacity: var(--wt-op, 0.92); } 86% { opacity: var(--wt-op, 0.92); } 100% { opacity: 0; } }
      `}</style>
      <div
        key={sighting.id}
        className="absolute"
        style={{
          top: `${topPct}%`,
          left: 0,
          transform: `translateX(${drifting ? endX : startX})`,
          transition: `transform ${DRIFT_MS}ms linear`,
          animation: `wt-sighting-fade ${DRIFT_MS}ms ease-in-out both`,
          willChange: 'transform, opacity',
        }}
      >
        <div style={{ animation: 'wt-sighting-bob 4.2s ease-in-out infinite', willChange: 'transform' }}>
        {kind === 'whale' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={SIGHTING_ASSET.whale}
            alt=""
            style={{
              width: 'clamp(110px, 22vmin, 240px)',
              height: 'auto',
              transform: `scaleX(${faceFlip})`,
              filter: 'drop-shadow(0 0 16px rgba(120,180,255,0.4))',
            }}
          />
        )}
        {kind === 'shootingStar' && (
          <div
            style={{
              width: 'clamp(80px, 16vmin, 200px)',
              height: 2,
              transform: 'rotate(-18deg)',
              background: 'linear-gradient(90deg, transparent, #fffef0)',
              boxShadow: '0 0 10px 1px rgba(255,255,255,0.7)',
              borderRadius: 2,
            }}
          />
        )}
        {kind === 'satellite' && (
          <div
            style={{
              width: 'clamp(6px, 1.4vmin, 12px)',
              height: 'clamp(6px, 1.4vmin, 12px)',
              background: '#fffef0',
              transform: 'rotate(45deg)',
              boxShadow: '0 0 8px 2px rgba(190,220,255,0.8)',
            }}
          />
        )}
        </div>
      </div>
    </div>
  );
}
