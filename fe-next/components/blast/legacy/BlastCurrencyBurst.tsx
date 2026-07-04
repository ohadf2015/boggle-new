'use client';

import { useEffect, useState } from 'react';
import { Coins, Gem } from 'lucide-react';
import { AdaptiveMotion, AdaptiveAnimatePresence } from '@/components/motion/AdaptiveMotion';

export interface CurrencyBurstEvent {
  /** Unique, monotonically increasing id — a new id replays the burst. */
  id: number;
  kind: 'coin' | 'gem';
  amount: number;
  /** Emit origin as a % of the overlay (0-100). Defaults to board centre. */
  originX?: number;
  originY?: number;
}

interface BlastCurrencyBurstProps {
  burst: CurrencyBurstEvent | null;
}

// Deterministic fan of sprites (no Math.random in render). Each coin fountains
// up-and-out then falls back under "gravity", spinning — a slot-machine payout.
const SPRAY = [
  { x: -86, y: -104, r: -220, d: 0 }, { x: 78, y: -120, r: 260, d: 30 },
  { x: -44, y: -140, r: -180, d: 55 }, { x: 52, y: -150, r: 200, d: 15 },
  { x: -120, y: -70, r: -300, d: 70 }, { x: 116, y: -84, r: 300, d: 45 },
  { x: -18, y: -160, r: -120, d: 90 }, { x: 24, y: -158, r: 140, d: 25 },
  { x: -70, y: -128, r: -240, d: 60 }, { x: 66, y: -136, r: 240, d: 80 },
  { x: -100, y: -100, r: -280, d: 35 }, { x: 96, y: -110, r: 280, d: 50 },
];

/**
 * BlastCurrencyBurst — a casino-style coin/gem payout. On each new burst event it
 * sprays spinning coin (or gem) sprites out from the win origin, arcing up then
 * falling, while a bold "+N" stamp pops and rises. Big gem drops add a radial
 * jackpot flash. Purely decorative; reduced-motion is handled by AdaptiveMotion.
 */
export default function BlastCurrencyBurst({ burst }: BlastCurrencyBurstProps) {
  const [active, setActive] = useState<CurrencyBurstEvent | null>(null);

  useEffect(() => {
    if (!burst) return;
    setActive(burst);
    const hold = burst.kind === 'gem' ? 1100 : 850;
    const id = setTimeout(() => setActive(null), hold);
    return () => clearTimeout(id);
  }, [burst]);

  const isGem = active?.kind === 'gem';
  const accent = isGem ? '#C084FC' : '#FFC53D';
  const Icon = isGem ? Gem : Coins;
  // Bigger amounts spray more sprites (up to the full deterministic fan).
  const spriteCount = active ? Math.min(SPRAY.length, 4 + (active.amount ?? 1) * 2) : 0;
  const jackpot = isGem && (active?.amount ?? 0) >= 3;

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <AdaptiveAnimatePresence>
        {active && (
          <div
            key={active.id}
            className="absolute"
            style={{ left: `${active.originX ?? 50}%`, top: `${active.originY ?? 55}%`, transform: 'translate(-50%, -50%)' }}
          >
            {/* Jackpot flash — a soft radial pop behind the payout */}
            {jackpot && (
              <AdaptiveMotion.span
                aria-hidden="true"
                className="absolute left-1/2 top-1/2 aspect-square w-64 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{ background: `radial-gradient(circle, ${accent}66 0%, transparent 68%)` }}
                initial={{ scale: 0.2, opacity: 0 }}
                animate={{ scale: [0.2, 1.3, 1], opacity: [0, 0.9, 0] }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
              />
            )}

            {/* Coin/gem spray */}
            {SPRAY.slice(0, spriteCount).map((s, i) => (
              <AdaptiveMotion.span
                key={i}
                aria-hidden="true"
                className="absolute left-0 top-0"
                initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                animate={{
                  x: [0, s.x, s.x * 1.05],
                  y: [0, s.y, s.y + 150],
                  scale: [0, 1, 0.9],
                  opacity: [0, 1, 0],
                  rotate: [0, s.r, s.r * 1.4],
                }}
                transition={{ duration: 0.85, delay: s.d / 1000, ease: [0.3, 0.9, 0.5, 1] }}
              >
                <Icon
                  className="h-5 w-5"
                  style={{ color: accent, filter: `drop-shadow(0 0 5px ${accent})` }}
                  strokeWidth={2.75}
                />
              </AdaptiveMotion.span>
            ))}

            {/* "+N" payout stamp */}
            <AdaptiveMotion.div
              className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5"
              initial={{ scale: 0.3, y: 8, opacity: 0 }}
              animate={{ scale: [0.3, 1.3, 1], y: [8, -18, -34], opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, times: [0, 0.4, 1], ease: 'easeOut' }}
            >
              <Icon className="h-6 w-6" style={{ color: accent, filter: `drop-shadow(0 0 6px ${accent})` }} strokeWidth={2.75} aria-hidden="true" />
              <span
                className="font-neo-display text-3xl font-black leading-none"
                style={{ color: accent, textShadow: `0 2px 0 rgba(0,0,0,0.55), 0 0 14px ${accent}aa` }}
              >
                +{active.amount}
              </span>
            </AdaptiveMotion.div>
          </div>
        )}
      </AdaptiveAnimatePresence>
    </div>
  );
}
