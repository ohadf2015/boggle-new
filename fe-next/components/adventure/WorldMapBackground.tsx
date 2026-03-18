'use client';

import { useMemo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';
import { Cloud } from './WorldMapDecorations';

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

  // Derive per-layer parallax from MotionValues (zero re-renders)
  const bgX = useTransform(parallaxX, (v) => v * 0.05);
  const bgY = useTransform(parallaxY, (v) => v * 0.05);
  const milkyX = useTransform(parallaxX, (v) => v * 0.1);
  const milkyY = useTransform(parallaxY, (v) => v * 0.1);
  const dustX = useTransform(parallaxX, (v) => v * 0.15);
  const dustY = useTransform(parallaxY, (v) => v * 0.15);
  const nebulaX = useTransform(parallaxX, (v) => v * 0.25);
  const nebulaY = useTransform(parallaxY, (v) => v * 0.25);
  const shootingX = useTransform(parallaxX, (v) => v * 0.2);
  const shootingY = useTransform(parallaxY, (v) => v * 0.2);
  const starsParallaxX = useTransform(parallaxX, (v) => v * 0.4);
  const starsParallaxY = useTransform(parallaxY, (v) => v * 0.4);
  const cloudsParallaxX = useTransform(parallaxX, (v) => v * 0.6);
  const cloudsParallaxY = useTransform(parallaxY, (v) => v * 0.6);

  // Pre-generate star positions for galaxy background
  const stars = useMemo(() => {
    const seededRandom = (seed: number) => {
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: 40 }, (_, i) => ({
      id: i,
      left: seededRandom(i * 1.1) * 100,
      top: seededRandom(i * 2.3) * 100,
      opacity: 0.15 + seededRandom(i * 3.7) * 0.6,
      duration: 2 + seededRandom(i * 4.2) * 4,
      delay: seededRandom(i * 5.1) * 3,
      size: i % 5 === 0 ? 4 : i % 3 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
      color: i % 7 === 0 ? '#a5f3fc' : i % 11 === 0 ? '#fcd34d' : i % 13 === 0 ? '#f9a8d4' : '#ffffff',
    }));
  }, []);

  // Nebula clouds — pre-blurred radial gradients replace blur(100-120px) filters
  const nebulaClouds = useMemo(() => [
    { left: '10%', top: '10%', color: 'rgba(139, 92, 246, 0.08)', size: 500 },
    { left: '75%', top: '35%', color: 'rgba(236, 72, 153, 0.06)', size: 480 },
    { left: '5%', top: '60%', color: 'rgba(34, 211, 238, 0.07)', size: 460 },
    { left: '70%', top: '80%', color: 'rgba(251, 191, 36, 0.06)', size: 450 },
  ], []);

  const shootingStars = useMemo(() => [
    { delay: 0, duration: 2, startX: 15, startY: 15 },
    { delay: 8, duration: 1.8, startX: 75, startY: 50 },
  ], []);

  return (
    <>
      {/* Deep space background gradient */}
      <AdaptiveMotion.div
        className="fixed inset-0 bg-gradient-to-b from-[#050510] via-[#0a0a2a] to-[#0d1033] pointer-events-none"
        style={{ x: bgX, y: bgY }}
      />

      {/* Milky Way band */}
      <AdaptiveMotion.div
        className="fixed inset-0 pointer-events-none opacity-30"
        style={{
          background: 'linear-gradient(135deg, transparent 20%, rgba(139,92,246,0.1) 35%, rgba(236,72,153,0.08) 50%, rgba(34,211,238,0.1) 65%, transparent 80%)',
          x: milkyX,
          y: milkyY,
        }}
      />

      {/* Cosmic dust particles */}
      <AdaptiveMotion.div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage: `radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(1px 1px at 90px 40px, rgba(255,255,255,0.2), transparent),
                           radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.3), transparent),
                           radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.15), transparent)`,
          backgroundSize: '200px 200px',
          x: dustX,
          y: dustY,
        }}
      />

      {/* Nebula clouds — radial-gradient only, blur capped at 40px (skip on low-end) */}
      <AdaptiveMotion.div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ x: nebulaX, y: nebulaY }}
      >
        {nebulaClouds.map((nebula, i) => (
          <div
            key={i}
            className="world-map-nebula"
            style={{
              left: nebula.left,
              top: nebula.top,
              width: nebula.size,
              height: nebula.size,
              background: `radial-gradient(circle, ${nebula.color} 0%, transparent 60%)`,
              filter: skipBlur ? 'none' : 'blur(40px)',
              willChange: skipBlur ? 'auto' : 'transform',
              '--nebula-duration': `${12 + i * 2}s`,
            } as React.CSSProperties}
          />
        ))}
      </AdaptiveMotion.div>

      {/* Shooting stars */}
      <AdaptiveMotion.div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{ x: shootingX, y: shootingY }}
      >
        {shootingStars.map((star, i) => (
          <div
            key={i}
            className="world-map-shooting-star"
            style={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              '--shooting-duration': `${star.duration}s`,
              '--shooting-delay': `${star.delay + i * 15}s`,
            } as React.CSSProperties}
          />
        ))}
      </AdaptiveMotion.div>

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
              boxShadow: star.size > 2 ? `0 0 ${star.size * 2}px ${star.color}` : 'none',
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
        <Cloud className="top-[15%] left-[5%]" size="md" speed={0.5} />
        <Cloud className="top-[50%] right-[6%]" size="lg" speed={0.4} />
        <Cloud className="top-[80%] left-[8%]" size="sm" speed={0.6} />
      </AdaptiveMotion.div>
    </>
  );
}
