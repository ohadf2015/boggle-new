/**
 * ScoreGaugeRing Component
 * Animated SVG circular gauge that fills proportionally to score/max.
 * Used as the hero element in the Speedometer Gauge results design.
 * Enhanced with glowing aura, tick marks, and sparkle particles.
 */

'use client';

import React, { useMemo } from 'react';
import { m } from 'framer-motion';
import { useCountUp } from '@/hooks/useCountUp';
import { useDevicePerformance } from '@/hooks/useDevicePerformance';

export interface ScoreGaugeRingProps {
  score: number;
  maxScore: number;
  /** Outer diameter in px */
  size?: number;
  /** Ring thickness in px */
  strokeWidth?: number;
  /** Tailwind color class for the filled arc (without 'text-' prefix) */
  color?: 'neo-lime' | 'neo-cyan' | 'neo-pink' | 'neo-yellow' | 'neo-orange';
  /** Animation delay in seconds */
  delay?: number;
  /** Show score number in center */
  showScore?: boolean;
  /** Label text below score */
  label?: string;
  /** Icon element rendered above score */
  icon?: React.ReactNode;
  /** Additional className */
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  'neo-lime': '#BFFF00',
  'neo-cyan': '#00FFFF',
  'neo-pink': '#FF1493',
  'neo-yellow': '#FFE135',
  'neo-orange': '#FF6B35',
};

/** Generate tick mark positions around the ring */
function generateTicks(count: number, radius: number, cx: number, cy: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    const innerR = radius - 6;
    const outerR = radius + 6;
    return {
      x1: cx + Math.cos(angle) * innerR,
      y1: cy + Math.sin(angle) * innerR,
      x2: cx + Math.cos(angle) * outerR,
      y2: cy + Math.sin(angle) * outerR,
      isMajor: i % 5 === 0,
    };
  });
}

export const ScoreGaugeRing: React.FC<ScoreGaugeRingProps> = ({
  score,
  maxScore,
  size = 200,
  strokeWidth = 12,
  color = 'neo-lime',
  delay = 0.3,
  showScore = true,
  label,
  icon,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = maxScore > 0 ? Math.min(score / maxScore, 1) : 0;
  const strokeDashoffset = circumference * (1 - percentage);
  const isLargeRing = size >= 150;

  // Adaptive: drop the ambient glow + sparkles on low-end / reduced-motion
  // devices, and cap sparkle count. The loops are ALSO made finite below so
  // even capable devices stop animating after the entrance (the page goes
  // idle instead of repainting SVG forever — that was the "stuck/slow" cause).
  const { enableGlowEffects, maxParticles, prefersReducedMotion, isLowEnd } = useDevicePerformance();
  const showDecorations = isLargeRing && enableGlowEffects;

  const animatedScore = useCountUp({
    target: score,
    duration: 1400,
    startDelay: delay * 1000 + 200,
    immediate: prefersReducedMotion || isLowEnd,
  });

  const fillColor = COLOR_MAP[color] || '#BFFF00';

  // Tick marks for large rings only
  const ticks = useMemo(() => {
    if (!isLargeRing) return [];
    return generateTicks(20, radius, size / 2, size / 2);
  }, [isLargeRing, radius, size]);

  // Sparkle positions along the filled arc (decorations only)
  const sparkles = useMemo(() => {
    if (!showDecorations || percentage === 0) return [];
    const count = Math.min(Math.max(2, Math.floor(percentage * 5)), maxParticles);
    return Array.from({ length: count }, (_, i) => {
      const t = (i + 0.5) / count;
      const angle = t * percentage * 2 * Math.PI - Math.PI / 2;
      return {
        cx: size / 2 + Math.cos(angle) * radius,
        cy: size / 2 + Math.sin(angle) * radius,
        delay: delay + 1.2 + i * 0.15,
      };
    });
  }, [showDecorations, maxParticles, percentage, radius, size, delay]);

  return (
    <div
      data-testid="score-gauge-ring"
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Glow aura behind the ring — fades in once and SETTLES to a steady
          glow (no infinite pulse). A permanent loop here kept the whole
          results page repainting forever. */}
      {showDecorations && percentage > 0 && (
        <m.div
          className="absolute inset-0 rounded-full pointer-events-none"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.4, 0.3], scale: [0.8, 1.05, 1.02] }}
          transition={{ delay: delay + 0.8, duration: 1.6, ease: 'easeOut' }}
          style={{
            background: `radial-gradient(circle, ${fillColor}20 0%, ${fillColor}08 50%, transparent 70%)`,
          }}
        />
      )}

      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Glow filter definition */}
        <defs>
          <filter id={`glow-${color}-${size}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Tick marks (large rings only) */}
        {ticks.map((tick, i) => (
          <m.line
            key={`${tick.x1}-${tick.y1}-${tick.x2}-${tick.y2}`}
            x1={tick.x1}
            y1={tick.y1}
            x2={tick.x2}
            y2={tick.y2}
            stroke={tick.isMajor ? '#4a4a6e' : '#3a3a5e'}
            strokeWidth={tick.isMajor ? 2 : 1}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: delay + i * 0.02, duration: 0.2 }}
          />
        ))}

        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a2a4e"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Glowing under-layer (wider, blurred version of the fill) */}
        {isLargeRing && percentage > 0 && (
          <m.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth + 8}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, delay, ease: [0.34, 1.56, 0.64, 1] }}
            opacity={0.2}
            filter={`url(#glow-${color}-${size})`}
          />
        )}

        {/* Animated fill arc */}
        <m.circle
          data-testid="gauge-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{
            duration: 1.2,
            delay,
            ease: [0.34, 1.56, 0.64, 1], // bouncy overshoot
          }}
        />

        {/* Sparkle particles along the filled arc — twinkle a couple of times
            then stop (finite repeat). Animating SVG `r` forever was a constant
            repaint; capped here so the page can go idle after the entrance. */}
        {sparkles.map((s, i) => (
          <m.circle
            key={`sparkle-${i}`}
            data-testid="gauge-sparkle"
            cx={s.cx}
            cy={s.cy}
            r={3}
            fill="white"
            initial={{ opacity: 0, r: 0 }}
            animate={{
              opacity: [0, 1, 0.6, 0],
              r: [0, 4, 2, 0],
            }}
            transition={{
              delay: s.delay,
              duration: 1.2,
              repeat: 2,
              repeatDelay: 1.5 + i * 0.3,
            }}
          />
        ))}
      </svg>

      {/* Center content */}
      {showScore && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {icon && <div className="mb-0.5">{icon}</div>}
          <m.span
            data-testid="gauge-score"
            className="font-black leading-none tracking-tight"
            style={{
              fontSize: size * 0.22,
              color: fillColor,
              textShadow: isLargeRing ? `0 0 20px ${fillColor}60, 0 0 40px ${fillColor}30` : undefined,
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: delay + 0.3, type: 'spring', stiffness: 300, damping: 20 }}
          >
            {animatedScore}
          </m.span>
          {maxScore > 0 && (
            <span
              className="text-slate-500 font-bold"
              style={{ fontSize: size * 0.08 }}
            >
              / {maxScore}
            </span>
          )}
          {label && (
            <span
              className="text-slate-400 font-bold uppercase tracking-wider mt-1"
              style={{ fontSize: Math.max(size * 0.065, 10) }}
            >
              {label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreGaugeRing;
