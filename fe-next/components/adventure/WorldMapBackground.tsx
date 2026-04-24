'use client';

import { useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { Cloud } from './WorldMapDecorations';
import { createNoise2D } from 'simplex-noise';

interface WorldMapBackgroundProps {
  parallaxX: MotionValue<number>;
  parallaxY: MotionValue<number>;
  starsY: MotionValue<number>;
  cloudsY: MotionValue<number>;
}

/** All background layers for WorldMap (starfield, nebulae, clouds, shooting stars) */
export function WorldMapBackground({
  parallaxX,
  parallaxY,
  starsY,
  cloudsY,
}: WorldMapBackgroundProps): React.JSX.Element {
  const { isLowEnd, prefersReducedMotion } = useDevicePerformance();
  const skipBlur = isLowEnd || prefersReducedMotion;

  // Only 2 parallax layers instead of 7 — each useTransform creates a
  // MotionValue subscription that fires on every gesture/gyro event.
  const starsParallaxX = useTransform(parallaxX, (v) => v * 0.3);
  const starsParallaxY = useTransform(parallaxY, (v) => v * 0.3);
  const cloudsParallaxX = useTransform(parallaxX, (v) => v * 0.5);
  const cloudsParallaxY = useTransform(parallaxY, (v) => v * 0.5);

  // Star generation with 2D simplex noise for spatially coherent clustering.
  // Stars cluster in "dense" regions where noise > threshold, creating a natural sky.
  const starCount = isLowEnd ? 6 : 12;
  const stars = useMemo(() => {
    // Seeded PRNG for deterministic noise (Mulberry32)
    let rngState = 42;
    const seededRng = (): number => {
      // eslint-disable-next-line react-hooks/immutability -- rngState mutation is local to this memo callback
      rngState = (rngState + 0x6d2b79f5) | 0;
      let t = rngState;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const noise2D = createNoise2D(seededRng);

    // Generate candidate stars, keep those in high-density noise regions
    const candidates: Array<{ left: number; top: number; density: number }> = [];
    const gridSteps = 30; // sample a 30×30 grid
    for (let gx = 0; gx < gridSteps; gx++) {
      for (let gy = 0; gy < gridSteps; gy++) {
        const x = (gx / gridSteps) * 100;
        const y = (gy / gridSteps) * 100;
        // Low frequency noise for broad density clusters
        const density = (noise2D(gx * 0.15, gy * 0.15) + 1) / 2; // normalize to [0, 1]
        if (density > 0.45) {
          // Jitter position within the cell for organic placement
          const jitterX = x + (seededRng() - 0.5) * (100 / gridSteps);
          const jitterY = y + (seededRng() - 0.5) * (100 / gridSteps);
          candidates.push({ left: Math.max(0, Math.min(100, jitterX)), top: Math.max(0, Math.min(100, jitterY)), density });
        }
      }
    }

    // Sort by density (brightest first), take starCount
    candidates.sort((a, b) => b.density - a.density);
    const picked = candidates.slice(0, starCount);

    return picked.map((s, i) => ({
      id: i,
      left: s.left,
      top: s.top,
      // Brightness correlates with noise density
      opacity: 0.15 + s.density * 0.6,
      duration: 2 + seededRng() * 4,
      delay: seededRng() * 3,
      size: s.density > 0.8 ? 4 : s.density > 0.65 ? 3 : s.density > 0.5 ? 2 : 1,
      color: i % 7 === 0 ? '#a5f3fc' : i % 11 === 0 ? '#fcd34d' : i % 13 === 0 ? '#f9a8d4' : '#ffffff',
    }));
  }, [starCount]);

  // Nebula clouds — pre-blurred radial gradients replace blur(100-120px) filters
  const nebulaClouds = useMemo(() => [
    { left: '10%', top: '10%', color: 'rgba(139, 92, 246, 0.08)', width: 700, height: 350, radius: '60% 40% 55% 45% / 45% 55% 40% 60%' },
    { left: '65%', top: '35%', color: 'rgba(236, 72, 153, 0.06)', width: 650, height: 300, radius: '45% 55% 60% 40% / 50% 40% 55% 45%' },
    { left: '0%',  top: '60%', color: 'rgba(34, 211, 238, 0.07)', width: 680, height: 320, radius: '55% 45% 40% 60% / 40% 60% 45% 55%' },
    { left: '60%', top: '80%', color: 'rgba(251, 191, 36, 0.06)', width: 620, height: 280, radius: '40% 60% 50% 50% / 55% 45% 60% 40%' },
  ], []);

  const shootingStars = useMemo(() => [
    { delay: 0, duration: 2, startX: 15, startY: 15 },
    { delay: 8, duration: 1.8, startX: 75, startY: 50 },
  ], []);

  return (
    <>
      {/* Deep space background gradient — static, no parallax (saves a MotionValue layer) */}
      <div className="fixed inset-0 bg-linear-to-b from-neo-abyss-deep via-neo-abyss-mid to-neo-abyss-light pointer-events-none" />

      {/* Milky Way band + cosmic dust merged into one static layer */}
      <div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent 20%, rgba(139,92,246,0.1) 35%, rgba(236,72,153,0.08) 50%, rgba(34,211,238,0.1) 65%, transparent 80%)',
        }}
      />

      {/* Nebula clouds — large pre-blurred radial gradients (NO filter:blur).
          Static layer — no parallax needed for background nebulae. */}
      {!skipBlur && <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {nebulaClouds.map((nebula, i) => (
          <div
            key={`nebula-${i}-${nebula.left}`}
            className="world-map-nebula"
            style={{
              left: nebula.left,
              top: nebula.top,
              width: nebula.width,
              height: nebula.height,
              borderRadius: nebula.radius,
              background: `radial-gradient(ellipse 70% 50% at 40% 50%, ${nebula.color} 0%, ${nebula.color.replace(/[\d.]+\)$/, '0.03)')} 50%, transparent 70%), radial-gradient(ellipse 50% 60% at 65% 45%, ${nebula.color.replace(/[\d.]+\)$/, '0.05)')} 0%, transparent 60%)`,
              '--nebula-duration': `${12 + i * 2}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>}

      {/* Shooting stars — static container, CSS-animated children */}
      {!isLowEnd && <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {shootingStars.map((star, i) => (
          <div
            key={`shooting-${i}-${star.startX}-${star.startY}`}
            className="world-map-shooting-star"
            style={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              '--shooting-duration': `${star.duration}s`,
              '--shooting-delay': `${star.delay + i * 15}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>}

      {/* Starfield with parallax */}
      <AdaptiveMotion.div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          y: starsY,
          x: starsParallaxX,
          translateY: starsParallaxY,
        }}
      >
        {stars.map((star) => (
          <div
            key={star.id}
            className={cn(
              'world-map-star',
              star.size > 3 ? 'world-map-star--large' :
              star.size > 2 ? 'world-map-star--medium' :
              'world-map-star--small'
            )}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              backgroundColor: star.color,
              boxShadow: !isLowEnd && star.size > 3 ? `0 0 ${star.size * 2}px ${star.color}` : 'none',
              '--star-opacity-min': star.opacity * 0.4,
              '--star-opacity-max': star.opacity,
              '--star-duration': `${star.duration}s`,
              '--star-delay': `${star.delay}s`,
              '--star-scale': star.size > 2 ? 1.3 : 1.5,
            } as React.CSSProperties}
          />
        ))}
      </AdaptiveMotion.div>

      {/* Floating clouds with parallax */}
      <AdaptiveMotion.div
        className="fixed inset-0 pointer-events-none"
        style={{
          y: cloudsY,
          x: cloudsParallaxX,
          translateY: cloudsParallaxY,
        }}
      >
        <Cloud className="top-[12%] left-[3%]" size="lg" speed={0.3} />
        <Cloud className="top-[45%] right-[4%]" size="md" speed={0.4} />
        <Cloud className="top-[75%] left-[6%]" size="lg" speed={0.35} />
        <Cloud className="top-[30%] right-[12%]" size="sm" speed={0.5} />
      </AdaptiveMotion.div>
    </>
  );
}
