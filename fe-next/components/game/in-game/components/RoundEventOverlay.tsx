'use client';

import { memo, useEffect, useState } from 'react';
import { AdaptiveAnimatePresence, AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { RoundEventCanvas } from './RoundEventCanvas';
import type { TranslationFn } from '../types';

export type RoundEventType = 'blizzard' | 'lightning' | 'meteor';

export interface RoundEventState {
  type: RoundEventType;
  phase: 'warning' | 'active' | 'idle';
  duration?: number;
}

interface RoundEventOverlayProps {
  event: RoundEventState | null;
  t: TranslationFn;
}

// Edge glow colors per event — used by 4 independent edge strips
const EDGE_GLOW: Record<RoundEventType, { color: string; rgb: string }> = {
  blizzard:  { color: 'cyan',   rgb: '96,165,250' },
  lightning: { color: 'yellow', rgb: '250,204,21' },
  meteor:    { color: 'orange', rgb: '251,146,60' },
};

const EVENT_CONFIG: Record<RoundEventType, {
  warningText: string;
  effectText: string;
  icon: string;
  warningBg: string;
  warningGlow: string;
}> = {
  blizzard: {
    warningText: 'roundEvent.blizzardWarning',
    effectText: 'roundEvent.blizzardEffect',
    icon: '❄️',
    warningBg: 'bg-linear-to-r from-blue-900/95 via-cyan-900/95 to-blue-900/95 border-cyan-300',
    warningGlow: 'shadow-[0_0_60px_rgba(96,165,250,0.8),0_0_120px_rgba(96,165,250,0.3)]',
  },
  lightning: {
    warningText: 'roundEvent.lightningWarning',
    effectText: 'roundEvent.lightningEffect',
    icon: '⚡',
    warningBg: 'bg-linear-to-r from-indigo-900/95 via-purple-900/95 to-indigo-900/95 border-yellow-300',
    warningGlow: 'shadow-[0_0_60px_rgba(250,204,21,0.8),0_0_120px_rgba(250,204,21,0.3)]',
  },
  meteor: {
    warningText: 'roundEvent.meteorWarning',
    effectText: 'roundEvent.meteorEffect',
    icon: '☄️',
    warningBg: 'bg-linear-to-r from-red-900/95 via-orange-900/95 to-red-900/95 border-orange-300',
    warningGlow: 'shadow-[0_0_60px_rgba(251,146,60,0.8),0_0_120px_rgba(251,146,60,0.3)]',
  },
};

/**
 * EdgeGlow — 4 independent edge strips that pulse with staggered timing.
 * Creates an atmospheric living border without any scale transforms.
 */
const EdgeGlow = memo<{ eventType: RoundEventType }>(function EdgeGlow({ eventType }) {
  const { rgb } = EDGE_GLOW[eventType];
  const thickness = 28;

  // Each edge: gradient from event color → transparent, pulsing opacity
  const edges = [
    { side: 'top',    style: { top: 0, left: 0, right: 0, height: thickness, background: `linear-gradient(to bottom, rgba(${rgb},0.45), rgba(${rgb},0.08) 60%, transparent)` } },
    { side: 'bottom', style: { bottom: 0, left: 0, right: 0, height: thickness, background: `linear-gradient(to top, rgba(${rgb},0.45), rgba(${rgb},0.08) 60%, transparent)` } },
    { side: 'left',   style: { top: 0, left: 0, bottom: 0, width: thickness, background: `linear-gradient(to right, rgba(${rgb},0.35), rgba(${rgb},0.06) 60%, transparent)` } },
    { side: 'right',  style: { top: 0, right: 0, bottom: 0, width: thickness, background: `linear-gradient(to left, rgba(${rgb},0.35), rgba(${rgb},0.06) 60%, transparent)` } },
  ] as const;

  return (
    <>
      {edges.map(({ side, style }, i) => (
        <AdaptiveMotion.div
          key={side}
          className="absolute pointer-events-none z-40"
          style={style as React.CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.5, 1, 0.6, 0.9, 0.5] }}
          transition={{
            duration: 3 + i * 0.4,
            delay: i * 0.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        />
      ))}
      {/* Inner ambient shadow — subtle depth */}
      <AdaptiveMotion.div
        className="absolute inset-0 pointer-events-none z-40 rounded-neo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        style={{
          boxShadow: `inset 0 0 40px rgba(${rgb},0.12), inset 0 0 80px rgba(${rgb},0.06)`,
        }}
        aria-hidden="true"
      />
      {/* Corner accent glows */}
      {[
        { top: 0, left: 0 },
        { top: 0, right: 0 },
        { bottom: 0, left: 0 },
        { bottom: 0, right: 0 },
      ].map((pos, i) => (
        <AdaptiveMotion.div
          key={`corner-${i}`}
          className="absolute pointer-events-none z-40"
          style={{
            ...pos,
            width: 50,
            height: 50,
            background: `radial-gradient(circle at ${pos.left !== undefined ? '0% ' : '100% '}${pos.top !== undefined ? '0%' : '100%'}, rgba(${rgb},0.4), transparent 70%)`,
          } as React.CSSProperties}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.4, 0.9, 0.4] }}
          transition={{
            duration: 2,
            delay: i * 0.3 + 0.2,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          aria-hidden="true"
        />
      ))}
    </>
  );
});

/**
 * RoundEventOverlay — Dramatic warning banners + canvas particle effects for round events.
 * Warning: fullscreen cinematic announcement with screen flash + spring animation.
 * Active: canvas-driven particles (snow/meteors/lightning) + atmospheric edge glow strips.
 */
export const RoundEventOverlay = memo<RoundEventOverlayProps>(function RoundEventOverlay({
  event,
  t,
}) {
  const [showWarningFlash, setShowWarningFlash] = useState(false);

  // Brief screen flash when warning appears
  useEffect(() => {
    if (event?.phase === 'warning') {
      setShowWarningFlash(true);
      const timer = setTimeout(() => setShowWarningFlash(false), 200);
      return () => clearTimeout(timer);
    }
    setShowWarningFlash(false);
    return undefined;
  }, [event?.phase, event?.type]);

  if (!event || event.phase === 'idle') return null;

  const config = EVENT_CONFIG[event.type];

  return (
    <>
      {/* Screen flash on warning — bright then fade */}
      <AdaptiveAnimatePresence>
        {showWarningFlash && (
          <AdaptiveMotion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute inset-0 z-[60] pointer-events-none bg-white"
            aria-hidden="true"
          />
        )}
      </AdaptiveAnimatePresence>

      {/* Warning Banner — cinematic fullscreen announcement */}
      <AdaptiveAnimatePresence>
        {event.phase === 'warning' && (
          <AdaptiveMotion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 pointer-events-none flex items-center justify-center"
            aria-live="assertive"
            role="alert"
          >
            {/* Dark cinematic backdrop with vignette */}
            <div
              className="absolute inset-0"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)',
              }}
            />

            {/* Warning card — slam in with overshoot */}
            <AdaptiveMotion.div
              initial={{ scale: 0.1, y: -30, rotateX: 50 }}
              animate={{ scale: 1, y: 0, rotateX: 0 }}
              exit={{ scale: 1.5, opacity: 0, y: -20 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 20,
                mass: 0.7,
              }}
              className={`
                relative z-10 flex flex-col items-center gap-2
                px-10 py-5 rounded-2xl
                border-3 ${config.warningBg}
                ${config.warningGlow}
                font-neo-display
              `}
            >
              {/* Icon — big slam-in with overshoot bounce */}
              <AdaptiveMotion.span
                initial={{ scale: 0, rotate: -30, y: -20 }}
                animate={{ scale: 1, rotate: 0, y: 0 }}
                transition={{
                  delay: 0.08,
                  type: 'spring',
                  stiffness: 700,
                  damping: 12,
                }}
                className="text-5xl sm:text-6xl drop-shadow-lg"
                aria-hidden="true"
              >
                {config.icon}
              </AdaptiveMotion.span>

              {/* Text — slide up with slight delay */}
              <AdaptiveMotion.span
                initial={{ opacity: 0, y: 15, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.12, duration: 0.25, ease: 'easeOut' }}
                className="text-xl sm:text-2xl uppercase tracking-[0.2em] font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
              >
                {t(config.warningText)}
              </AdaptiveMotion.span>

              {/* Effect description — explains what the catalyst does */}
              <AdaptiveMotion.span
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18, duration: 0.25, ease: 'easeOut' }}
                className="text-sm sm:text-base font-medium text-white text-center max-w-xs drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
              >
                {t(config.effectText)}
              </AdaptiveMotion.span>

              {/* Decorative line under text */}
              <AdaptiveMotion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.25, duration: 0.3, ease: 'easeOut' }}
                className="h-[2px] w-32 rounded-full"
                style={{
                  background: `linear-gradient(to right, transparent, rgba(${EDGE_GLOW[event.type].rgb},0.8), transparent)`,
                }}
                aria-hidden="true"
              />
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        )}
      </AdaptiveAnimatePresence>

      {/* Active phase — atmospheric edge glow (replaces old border) */}
      <AdaptiveAnimatePresence>
        {event.phase === 'active' && <EdgeGlow eventType={event.type} />}
      </AdaptiveAnimatePresence>

      {/* Canvas particle effects */}
      <RoundEventCanvas event={event} />
    </>
  );
});
