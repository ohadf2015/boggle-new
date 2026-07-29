'use client';

import { memo, useEffect, useState } from 'react';
import { useScroll, useTransform } from 'framer-motion';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Star, Sparkles, Zap, Heart } from 'lucide-react';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

interface PlayfulBackgroundProps {
  /** Intensity of effects (0-1) */
  intensity?: 'low' | 'medium' | 'high';
  /** Show floating icons */
  showFloatingIcons?: boolean;
  /** Show gradient orbs */
  showGradientOrbs?: boolean;
  /** Show grid pattern */
  showGrid?: boolean;
  /** Color scheme */
  colorScheme?: 'default' | 'game' | 'celebration';
}

/**
 * Shared playful background component for all pages
 * Works on both desktop and mobile with touch/gyroscope support
 */
export const PlayfulBackground = memo(function PlayfulBackground({
  intensity = 'medium',
  showFloatingIcons = true,
  showGradientOrbs = true,
  showGrid = true,
  colorScheme = 'default',
}: PlayfulBackgroundProps) {
  const { enableComplexAnimations, prefersReducedMotion, isMobile } = useDevicePerformance();
  const { scrollY } = useScroll();

  // Mouse/touch position for parallax
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Gyroscope for mobile parallax (if available)
  const [gyro, setGyro] = useState({ x: 0, y: 0 });

  // Intensity multipliers
  const intensityMultiplier = intensity === 'low' ? 0.5 : intensity === 'high' ? 1.5 : 1;

  // Parallax transforms for scroll
  const y1 = useTransform(scrollY, [0, 500], [0, 150 * intensityMultiplier]);
  const y2 = useTransform(scrollY, [0, 500], [0, 100 * intensityMultiplier]);
  const y3 = useTransform(scrollY, [0, 500], [0, 50 * intensityMultiplier]);
  const rotate1 = useTransform(scrollY, [0, 500], [0, 15]);
  const rotate2 = useTransform(scrollY, [0, 500], [0, -10]);

  // Desktop mouse tracking
  useEffect(() => {
    if (prefersReducedMotion || !enableComplexAnimations || isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 30 * intensityMultiplier;
      const y = (e.clientY / window.innerHeight - 0.5) * 30 * intensityMultiplier;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [prefersReducedMotion, enableComplexAnimations, isMobile, intensityMultiplier]);

  // Mobile touch tracking
  useEffect(() => {
    if (prefersReducedMotion || !enableComplexAnimations || !isMobile) return;

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const touch = e.touches[0];
      const x = (touch.clientX / window.innerWidth - 0.5) * 20 * intensityMultiplier;
      const y = (touch.clientY / window.innerHeight - 0.5) * 20 * intensityMultiplier;
      setMousePos({ x, y });
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => window.removeEventListener('touchmove', handleTouchMove);
  }, [prefersReducedMotion, enableComplexAnimations, isMobile, intensityMultiplier]);

  // Mobile gyroscope support
  useEffect(() => {
    if (prefersReducedMotion || !enableComplexAnimations || !isMobile) return;
    if (typeof DeviceOrientationEvent === 'undefined') return;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const x = ((e.gamma || 0) / 45) * 15 * intensityMultiplier; // -90 to 90 degrees
      const y = ((e.beta || 0) / 45) * 15 * intensityMultiplier;  // -180 to 180 degrees
      setGyro({ x: Math.max(-20, Math.min(20, x)), y: Math.max(-20, Math.min(20, y)) });
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true } as AddEventListenerOptions);
    return () => window.removeEventListener('deviceorientation', handleOrientation);
  }, [prefersReducedMotion, enableComplexAnimations, isMobile, intensityMultiplier]);

  // Combined parallax (mouse on desktop, touch/gyro on mobile)
  const parallax = isMobile ? { x: gyro.x + mousePos.x, y: gyro.y + mousePos.y } : mousePos;

  // Color schemes
  const colors = {
    default: {
      orb1: 'bg-neo-pink/20',
      orb2: 'bg-neo-cyan/15',
      orb3: 'bg-neo-lime/10',
      icon1: 'text-neo-lime',
      icon2: 'text-neo-pink',
      icon3: 'text-neo-cyan',
      icon4: 'text-neo-purple',
    },
    game: {
      orb1: 'bg-neo-cyan/25',
      orb2: 'bg-neo-purple/20',
      orb3: 'bg-neo-pink/15',
      icon1: 'text-neo-cyan',
      icon2: 'text-neo-purple',
      icon3: 'text-neo-pink',
      icon4: 'text-neo-lime',
    },
    celebration: {
      orb1: 'bg-neo-lime/25',
      orb2: 'bg-neo-pink/25',
      orb3: 'bg-neo-cyan/20',
      icon1: 'text-neo-lime',
      icon2: 'text-neo-pink',
      icon3: 'text-neo-cyan',
      icon4: 'text-neo-lime',
    },
  };

  const scheme = colors[colorScheme];

  // Static fallback for reduced motion - shows grid pattern only
  if (prefersReducedMotion) {
    return (
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
        {/* Static grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
        {/* Static dots for visual interest */}
        <div className={`absolute top-[12%] left-[35%] w-3 h-3 rounded-full bg-neo-lime opacity-40`} />
        <div className={`absolute top-[48%] left-[20%] w-2.5 h-2.5 rounded-full bg-neo-pink opacity-30`} />
        <div className={`absolute top-[65%] right-[25%] w-2.5 h-2.5 rounded-full bg-neo-cyan opacity-30`} />
        <div className={`absolute bottom-[35%] left-[45%] w-3 h-3 rounded-full bg-neo-purple opacity-35`} />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {/* Large grid pattern background - MUCH BIGGER */}
      {showGrid && (
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: '80px 80px',
          }}
        />
      )}

      {/* Diagonal lines pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(255,255,255,0.05) 100px,
            rgba(255,255,255,0.05) 102px
          )`,
        }}
      />

      {/* Gradient orbs with parallax - solid colors for Neo-Brutalist aesthetic */}
      {showGradientOrbs && enableComplexAnimations && (
        <>
          <AdaptiveMotion.div
            className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full ${scheme.orb1}`}
            style={{ y: y1, rotate: rotate1, x: parallax.x * 0.5, scale: 1.2 }}
          />
          <AdaptiveMotion.div
            className={`absolute top-1/3 -right-48 w-[400px] h-[400px] rounded-full ${scheme.orb2}`}
            style={{ y: y2, rotate: rotate2, x: parallax.x * -0.3 }}
          />
          <AdaptiveMotion.div
            className={`absolute bottom-0 left-1/4 w-[350px] h-[350px] rounded-full ${scheme.orb3}`}
            style={{ y: y3, x: parallax.x * 0.4 }}
          />
        </>
      )}

      {/* Floating icons with parallax - visible on both mobile and desktop */}
      {/* Neo-Brutalist: no glow shadows, clean solid colors */}
      {/* Reduced elements for cleaner desktop experience */}
      {showFloatingIcons && enableComplexAnimations && (
        <>
          {/* Top left star */}
          <AdaptiveMotion.div
            className={`absolute top-[8%] left-[5%] ${scheme.icon1}`}
            animate={{
              y: [0, -25, 0],
              rotate: [0, 20, 0],
              scale: [1, 1.15, 1]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ x: parallax.x * 0.6 }}
          >
            <Star className="w-8 h-8 sm:w-12 sm:h-12 fill-current" />
          </AdaptiveMotion.div>

          {/* Top right sparkles */}
          <AdaptiveMotion.div
            className={`absolute top-[15%] right-[8%] ${scheme.icon2}`}
            animate={{
              y: [0, -20, 0],
              rotate: [0, -25, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ type: 'tween', duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            style={{ x: parallax.x * -0.4 }}
          >
            <Sparkles className="w-7 h-7 sm:w-10 sm:h-10" />
          </AdaptiveMotion.div>

          {/* Left side zap */}
          <AdaptiveMotion.div
            className={`absolute top-[40%] left-[3%] ${scheme.icon3}`}
            animate={{
              y: [0, -30, 0],
              rotate: [0, 30, 0]
            }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            style={{ x: parallax.x * 0.8 }}
          >
            <Zap className="w-6 h-6 sm:w-9 sm:h-9 fill-current" />
          </AdaptiveMotion.div>

          {/* Bottom left heart */}
          <AdaptiveMotion.div
            className={`absolute bottom-[30%] left-[8%] ${scheme.icon2}`}
            animate={{
              y: [0, -22, 0],
              rotate: [0, -18, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
            style={{ x: parallax.x * 0.5 }}
          >
            <Heart className="w-5 h-5 sm:w-8 sm:h-8 fill-current" />
          </AdaptiveMotion.div>

          {/* Pulsing dots - Neo-Brutalist solid colors without glow */}
          {/* Reduced from 4 to 2 for cleaner appearance */}
          <AdaptiveMotion.div
            className={`absolute top-[12%] left-[35%] w-2.5 h-2.5 sm:w-4 sm:h-4 rounded-full bg-neo-lime`}
            animate={{ scale: [1, 1.8, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <AdaptiveMotion.div
            className={`absolute bottom-[35%] left-[45%] w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full bg-neo-purple`}
            animate={{ scale: [1, 1.9, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
        </>
      )}

      {/* Subtle noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});

export default PlayfulBackground;
