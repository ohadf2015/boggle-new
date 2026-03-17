/**
 * WordHuntLifeBar
 * Neo-brutalist life bar for Word Hunt in PortraitLayout.
 * Matches SurvivalLifeBar design: segmented pips, animated heart, shimmer, damage shake.
 */

'use client';

import { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface WordHuntLifeBarProps {
  life: number;
  maxLife: number;
}

function getLifeTier(pct: number) {
  if (pct > 66) return { gradient: 'from-emerald-400 via-green-400 to-emerald-500', heart: 'bg-emerald-500', glow: '' };
  if (pct > 33) return { gradient: 'from-amber-400 via-yellow-400 to-orange-400', heart: 'bg-amber-500', glow: '' };
  return { gradient: 'from-red-500 via-rose-500 to-red-600', heart: 'bg-red-500', glow: 'life-bar-danger-glow' };
}

export function WordHuntLifeBar({ life, maxLife }: WordHuntLifeBarProps) {
  const { t } = useLanguage();
  const pct = Math.min(100, Math.max(0, (life / maxLife) * 100));
  const tier = getLifeTier(pct);
  const isLow = pct <= 20;
  const isDanger = pct <= 33;

  // Track life decrease for shake
  const prevLifeRef = useRef(life);
  const [isDamaged, setIsDamaged] = useState(false);

  useEffect(() => {
    if (life < prevLifeRef.current) {
      setIsDamaged(true);
      const timer = setTimeout(() => setIsDamaged(false), 500);
      prevLifeRef.current = life;
      return () => clearTimeout(timer);
    }
    prevLifeRef.current = life;
    return undefined;
  }, [life]);

  const segments = [25, 50, 75];

  return (
    <div
      data-testid="word-hunt-life-bar"
      className={cn(
        "flex items-center gap-2 w-full py-1",
        isDamaged && "animate-neo-shake",
        tier.glow
      )}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={t('wordHunt.lifeBar')}
    >
      {/* Heart icon */}
      <motion.div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-full",
          "border-3 border-neo-black shadow-hard-sm",
          tier.heart
        )}
        animate={isLow ? { scale: [1, 1.2, 0.95, 1.1, 1] } : {}}
        transition={{ duration: 0.8, repeat: isLow ? Infinity : 0, ease: 'easeInOut' }}
      >
        <Heart data-testid="heart-icon" className="w-4 h-4 text-white fill-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
      </motion.div>

      {/* Bar */}
      <motion.div
        className={cn(
          "flex-1 h-7 rounded-neo overflow-hidden border-3 shadow-hard-sm relative",
          "bg-neo-navy/80",
          isLow ? "border-red-500" : "border-neo-black"
        )}
        animate={isLow ? { borderColor: ['#ef4444', '#991b1b', '#ef4444'] } : {}}
        transition={{ duration: 1, repeat: isLow ? Infinity : 0 }}
      >
        {/* Fill */}
        <motion.div
          data-testid="word-hunt-life-bar-fill"
          className={cn(
            "h-full relative overflow-hidden bg-gradient-to-r",
            tier.gradient,
            isLow && "life-bar-low-pulse"
          )}
          style={{ width: `${Math.max(pct, 8)}%` }}
          animate={{ width: `${Math.max(pct, 8)}%` }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          <div
            data-testid="word-hunt-life-bar-shimmer"
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer pointer-events-none"
          />
          <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-white/40 via-white/20 to-white/40 pointer-events-none" />
        </motion.div>

        {/* Segments */}
        {segments.map((seg) => (
          <div key={seg} className="absolute top-0 bottom-0 w-[2px] bg-neo-black/30 pointer-events-none" style={{ left: `${seg}%` }} />
        ))}

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={cn(
            "text-xs font-black tabular-nums tracking-wide",
            "drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]",
            pct > 50 ? "text-white" : "text-neo-white"
          )}>
            {Math.floor(life)}/{maxLife}
          </span>
        </div>

        {/* Drain particles */}
        {isDanger && pct > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-red-400 rounded-full opacity-80"
                style={{ left: `${pct}%`, top: '50%' }}
                animate={{
                  x: [0, 15 + i * 8],
                  y: [0, (i % 2 === 0 ? -12 : 12)],
                  opacity: [0.8, 0],
                  scale: [1, 0.3],
                }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3, ease: 'easeOut' }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
