'use client';

import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WaveResult } from './types';

// ---------------------------------------------------------------------------
// StarRating
// ---------------------------------------------------------------------------

/** Star display with fill animation and gold burst */
export function StarRating({ stars }: { stars: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-3">
      {[1, 2, 3].map(i => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{
            scale: i <= stars ? 1 : 0.6,
            rotate: i <= stars ? [0, -5, 5, 0] : 0,
            opacity: i <= stars ? 1 : 0.25,
          }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 15,
            delay: 0.3 + i * 0.2,
            rotate: { delay: 0.5 + i * 0.2, duration: 0.3 },
          }}
          style={{
            filter: i <= stars
              ? 'drop-shadow(0 0 8px rgba(255,215,0,0.6)) drop-shadow(0 0 16px rgba(255,215,0,0.3))'
              : 'none',
          }}
        >
          <Star
            className={cn(
              'w-11 h-11 sm:w-14 sm:h-14',
              i <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/15'
            )}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StatCard
// ---------------------------------------------------------------------------

/** Alternating rotation angles for playful card tilt */
const CARD_ROTATIONS = [0.8, -0.6, 0.5, -0.8, 0.6, -0.5];

/** Stat card — neo-brutalist with colored accent border and tilt */
export function StatCard({
  icon,
  label,
  value,
  accentColor = '#00FFFF',
  delay = 0,
  index = 0,
  isNewBest = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  accentColor?: string;
  delay?: number;
  index?: number;
  isNewBest?: boolean;
}) {
  const rotation = CARD_ROTATIONS[index % CARD_ROTATIONS.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, rotate: rotation * 2 }}
      animate={{ opacity: 1, y: 0, rotate: rotation }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
      className={cn(
        'flex items-center gap-3 px-4 py-3',
        'bg-white/5 rounded-neo border-3 border-neo-black/50 shadow-hard-sm',
      )}
      style={{ borderLeftColor: accentColor, borderLeftWidth: '4px' }}
    >
      <div style={{ color: accentColor }}>{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="font-black text-white text-lg leading-tight font-neo-display">{value}</div>
        <div className="text-[10px] font-bold text-white/45 uppercase tracking-wider">{label}</div>
      </div>
      {isNewBest && (
        <span
          className="px-2 py-0.5 text-[9px] font-black uppercase bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black shadow-hard-sm"
          style={{ transform: 'rotate(-3deg)' }}
        >
          NEW!
        </span>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// WaveBreakdown
// ---------------------------------------------------------------------------

const WAVE_COLORS = ['#A855F7', '#06B6D4', '#6366F1'];

/** Per-wave score breakdown list */
export function WaveBreakdown({ waveResults, label }: { waveResults: WaveResult[]; label: string }) {
  if (waveResults.length <= 1) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26, delay: 1.1 }}
      className="w-full max-w-sm mb-8"
    >
      <div className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-2 text-center">
        {label}
      </div>
      <div className="space-y-1.5 rounded-neo border-3 border-neo-black/50 bg-white/5 p-2 shadow-hard-sm">
        {waveResults.map((wr, idx) => {
          const color = WAVE_COLORS[idx % WAVE_COLORS.length];
          return (
            <motion.div
              key={wr.waveNumber}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26, delay: 1.2 + idx * 0.08 }}
              className={cn(
                'relative flex items-center gap-2 px-3 py-2 rounded-neo overflow-hidden',
                idx % 2 === 0 ? 'bg-white/5' : 'bg-white/[0.02]',
              )}
              style={{ borderLeft: '3px solid', borderLeftColor: color }}
            >
              <div className="absolute inset-y-0 left-0 opacity-10 rounded-neo" style={{ width: `${wr.clearPercentage}%`, background: color }} />
              <span className="font-black text-xs text-fuchsia-300 relative z-10 shrink-0">W{wr.waveNumber}</span>
              <span className="font-black text-sm text-white tabular-nums relative z-10">{wr.score}</span>
              <span className="text-[10px] text-white/60 relative z-10">pts</span>
              <div className="flex-1" />
              <span className="text-[10px] font-bold text-white/70 tabular-nums relative z-10">
                {wr.wordsFound}w · {wr.clearPercentage}%
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
