'use client';

import { memo } from 'react';
import { m } from 'framer-motion';

interface RoundEventTileEffectsProps {
  isFrozen: boolean;
  isCharged: boolean;
  isMeteor: boolean;
  isSelected: boolean;
  row: number;
  col: number;
}

/**
 * AAA-quality per-tile visual effects for round events.
 * Frozen: ice crystal formation with frost crawl + floating snowflakes
 * Charged: electric arcs with flickering energy field + sparks
 * Meteor: impact crater with glowing embers + heat shimmer
 */
const RoundEventTileEffects = memo<RoundEventTileEffectsProps>(function RoundEventTileEffects({
  isFrozen, isCharged, isMeteor, isSelected, row, col,
}) {
  if (isSelected || (!isFrozen && !isCharged && !isMeteor)) return null;

  const staggerDelay = (row + col) * 0.08;

  // ─── FROZEN ────────────────────────────────────────────
  if (isFrozen) {
    return (
      <>
        {/* Ice crystal base — frost crawl from edges */}
        <m.div
          className="absolute inset-0 rounded-[6px] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: staggerDelay }}
        >
          {/* Frosted glass effect */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(186,230,253,0.7) 0%, rgba(147,197,253,0.4) 30%, rgba(224,242,254,0.6) 60%, rgba(186,230,253,0.5) 100%)',
              backdropFilter: 'blur(1px)',
            }}
          />

          {/* Animated frost veins crawling from corners */}
          <m.div
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 0.6, 0.4], scale: [0.3, 1.1, 1] }}
            transition={{ duration: 0.8, delay: staggerDelay + 0.1, ease: 'easeOut' }}
            style={{
              background: `
                radial-gradient(ellipse at 0% 0%, rgba(186,230,253,0.8) 0%, transparent 50%),
                radial-gradient(ellipse at 100% 100%, rgba(147,197,253,0.6) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(224,242,254,0.3) 0%, transparent 60%)
              `,
            }}
          />

          {/* Ice crystal pattern — shimmer animation */}
          <div
            className="absolute inset-0 animate-[ice-crystal-shimmer_3s_ease-in-out_infinite]"
            style={{
              animationDelay: `${staggerDelay * 200}ms`,
              background: 'linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
              backgroundSize: '200% 200%',
            }}
          />
        </m.div>

        {/* Floating ice crystal particles */}
        {[0, 1, 2].map(i => (
          <m.div
            key={`ice-${i}`}
            className="absolute pointer-events-none z-20"
            style={{
              width: 6 + i * 2,
              height: 6 + i * 2,
              left: `${20 + i * 25}%`,
              top: `${15 + i * 20}%`,
            }}
            initial={{ opacity: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 0.8, 0.6, 0.8, 0],
              y: [0, -4 - i * 2, -2, -6 - i * 2, -8],
              rotate: [0, 60, 120, 180, 240],
              scale: [0.5, 1, 0.8, 1, 0.3],
            }}
            transition={{
              duration: 3 + i * 0.5,
              delay: staggerDelay + i * 0.6,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" className="w-full h-full">
              <path d="M12 2v20M2 12h20M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"
                stroke="rgba(186,230,253,0.9)" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </m.div>
        ))}

        {/* Frost edge glow */}
        <m.div
          className="absolute inset-[-2px] rounded-neo pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2, delay: staggerDelay, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            boxShadow: '0 0 12px rgba(96,165,250,0.5), 0 0 24px rgba(96,165,250,0.2), inset 0 0 8px rgba(186,230,253,0.3)',
          }}
        />

        {/* Ice badge */}
        <m.span
          className="absolute -top-1 -left-1 text-[10px] pointer-events-none select-none z-20 drop-shadow-[0_0_4px_rgba(96,165,250,0.8)]"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 15, delay: staggerDelay + 0.3 }}
          aria-hidden="true"
        >
          ❄️
        </m.span>
      </>
    );
  }

  // ─── CHARGED ───────────────────────────────────────────
  if (isCharged) {
    return (
      <>
        {/* Energy field base */}
        <m.div
          className="absolute inset-0 rounded-[6px] pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: staggerDelay }}
        >
          {/* Electric yellow/amber base */}
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(254,240,138,0.5) 0%, rgba(253,224,71,0.3) 50%, rgba(250,204,21,0.5) 100%)',
            }}
          />

          {/* Flickering energy field */}
          <div
            className="absolute inset-0 animate-[electric-flicker_0.15s_steps(2)_infinite]"
            style={{
              animationDelay: `${staggerDelay * 150}ms`,
              background: 'radial-gradient(ellipse at 50% 50%, rgba(250,204,21,0.4) 0%, transparent 70%)',
            }}
          />
        </m.div>

        {/* Electric arc lines — randomized SVG paths */}
        <m.svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox="0 0 100 100"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.3, 1, 0] }}
          transition={{ duration: 0.8, delay: staggerDelay + 0.1, repeat: Infinity, repeatDelay: 0.5 }}
        >
          <path
            d="M20,10 L35,30 L25,35 L50,60 L40,62 L60,90"
            stroke="rgba(250,204,21,0.9)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            filter="url(#lightning-glow)"
          />
          <path
            d="M70,5 L55,25 L65,28 L45,55 L55,58 L35,85"
            stroke="rgba(253,224,71,0.7)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
            filter="url(#lightning-glow)"
          />
          <defs>
            <filter id="lightning-glow">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
        </m.svg>

        {/* Spark particles */}
        {[0, 1, 2, 3].map(i => (
          <m.div
            key={`spark-${i}`}
            className="absolute rounded-full pointer-events-none z-20"
            style={{
              width: 3,
              height: 3,
              background: i % 2 === 0 ? '#FBBF24' : '#FDE68A',
              left: `${15 + i * 20}%`,
              top: `${20 + (i % 3) * 25}%`,
              boxShadow: `0 0 6px ${i % 2 === 0 ? 'rgba(251,191,36,0.9)' : 'rgba(253,230,138,0.9)'}`,
            }}
            animate={{
              opacity: [0, 1, 0],
              y: [0, -10 - i * 3, -20],
              x: [0, (i % 2 === 0 ? 5 : -5), (i % 2 === 0 ? 10 : -10)],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 0.6 + i * 0.15,
              delay: staggerDelay + i * 0.3,
              repeat: Infinity,
              repeatDelay: 0.8 + i * 0.2,
            }}
          />
        ))}

        {/* Electric border glow — rapid pulsing */}
        <m.div
          className="absolute inset-[-2px] rounded-neo pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 8px rgba(250,204,21,0.4), 0 0 16px rgba(250,204,21,0.2)',
              '0 0 16px rgba(250,204,21,0.8), 0 0 32px rgba(250,204,21,0.4), 0 0 4px rgba(255,255,255,0.6)',
              '0 0 8px rgba(250,204,21,0.4), 0 0 16px rgba(250,204,21,0.2)',
            ],
          }}
          transition={{ duration: 0.4, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Lightning badge with bounce */}
        <m.span
          className="absolute -top-1.5 -left-1.5 text-[12px] pointer-events-none select-none z-20 drop-shadow-[0_0_6px_rgba(250,204,21,0.9)]"
          initial={{ scale: 0, y: -10 }}
          animate={{ scale: [1, 1.2, 1], y: 0 }}
          transition={{
            scale: { type: 'tween', duration: 0.8, repeat: Infinity, ease: 'easeInOut' },
            y: { type: 'spring', stiffness: 500, damping: 15, delay: staggerDelay },
          }}
          aria-hidden="true"
        >
          ⚡
        </m.span>

        {/* 1.5x multiplier badge */}
        <m.span
          className="absolute -bottom-1 -right-1 text-[7px] font-black leading-none pointer-events-none select-none z-20 bg-yellow-400 text-yellow-900 px-1 py-0.5 rounded-full border border-yellow-600/50 shadow-[0_0_8px_rgba(250,204,21,0.6)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 15, delay: staggerDelay + 0.4 }}
          aria-hidden="true"
        >
          1.5×
        </m.span>
      </>
    );
  }

  // ─── METEOR ────────────────────────────────────────────
  if (isMeteor) {
    return (
      <>
        {/* Impact crater base */}
        <m.div
          className="absolute inset-0 rounded-[6px] pointer-events-none overflow-hidden"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: staggerDelay, ease: 'easeOut' }}
        >
          {/* Crater gradient — dark center, bright rim */}
          <div
            className="absolute inset-0"
            style={{
              background: `
                radial-gradient(circle at 45% 55%, rgba(120,30,0,0.4) 0%, rgba(251,146,60,0.3) 40%, rgba(253,186,116,0.5) 70%, rgba(251,146,60,0.6) 100%)
              `,
            }}
          />

          {/* Heat shimmer — wave distortion */}
          <div
            className="absolute inset-0 animate-[heat-shimmer_2s_ease-in-out_infinite]"
            style={{
              animationDelay: `${staggerDelay * 200}ms`,
              background: 'linear-gradient(0deg, transparent 40%, rgba(251,146,60,0.2) 50%, transparent 60%)',
              backgroundSize: '100% 200%',
            }}
          />
        </m.div>

        {/* Impact shockwave ring — expands outward on arrival */}
        <m.div
          className="absolute inset-[-4px] rounded-[10px] pointer-events-none"
          initial={{ scale: 0.5, opacity: 1 }}
          animate={{ scale: [0.5, 1.3, 1.5], opacity: [1, 0.5, 0] }}
          transition={{ duration: 0.6, delay: staggerDelay, ease: 'easeOut' }}
          style={{
            border: '2px solid rgba(251,146,60,0.8)',
            boxShadow: '0 0 12px rgba(251,146,60,0.6)',
          }}
        />

        {/* Ember particles rising */}
        {[0, 1, 2, 3, 4].map(i => (
          <m.div
            key={`ember-${i}`}
            className="absolute rounded-full pointer-events-none z-20"
            style={{
              width: 2 + (i % 3),
              height: 2 + (i % 3),
              background: i % 2 === 0 ? '#FB923C' : '#FBBF24',
              left: `${10 + i * 18}%`,
              bottom: `${10 + (i % 3) * 15}%`,
              boxShadow: `0 0 4px ${i % 2 === 0 ? 'rgba(251,146,60,0.9)' : 'rgba(251,191,36,0.9)'}`,
            }}
            animate={{
              opacity: [0, 1, 0.8, 0],
              y: [0, -8, -16 - i * 4, -28],
              x: [0, (i % 2 === 0 ? 3 : -3) * (i + 1) * 0.5, (i % 2 === 0 ? 6 : -6)],
              scale: [0.5, 1.2, 0.8, 0],
            }}
            transition={{
              duration: 1.5 + i * 0.3,
              delay: staggerDelay + 0.3 + i * 0.2,
              repeat: Infinity,
              repeatDelay: 0.5,
            }}
          />
        ))}

        {/* Crater glow — pulsing orange aura */}
        <m.div
          className="absolute inset-[-2px] rounded-neo pointer-events-none"
          animate={{
            boxShadow: [
              '0 0 8px rgba(251,146,60,0.3), 0 0 16px rgba(251,146,60,0.15)',
              '0 0 14px rgba(251,146,60,0.6), 0 0 28px rgba(251,146,60,0.3), inset 0 0 6px rgba(251,146,60,0.2)',
              '0 0 8px rgba(251,146,60,0.3), 0 0 16px rgba(251,146,60,0.15)',
            ],
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Meteor badge with impact animation */}
        <m.span
          className="absolute -top-1.5 -left-1.5 text-[11px] pointer-events-none select-none z-20 drop-shadow-[0_0_6px_rgba(251,146,60,0.9)]"
          initial={{ scale: 0, y: -20, rotate: -45 }}
          animate={{ scale: 1, y: 0, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 12, delay: staggerDelay }}
          aria-hidden="true"
        >
          ☄️
        </m.span>

        {/* "NEW" badge for replaced letter */}
        <m.span
          className="absolute -bottom-1 -right-1 text-[6px] font-black leading-none pointer-events-none select-none z-20 bg-orange-500 text-white px-1 py-0.5 rounded-full border border-orange-700/50 shadow-[0_0_8px_rgba(251,146,60,0.6)]"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 15, delay: staggerDelay + 0.5 }}
          aria-hidden="true"
        >
          NEW
        </m.span>
      </>
    );
  }

  return null;
});

export default RoundEventTileEffects;
