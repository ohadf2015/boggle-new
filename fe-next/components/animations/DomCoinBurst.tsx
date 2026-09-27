'use client';

import React, { useEffect, useRef, useState } from 'react';

export interface DomCoinBurstProps {
  source: { x: number; y: number };
  target: { x: number; y: number };
  count: number;
  onDone: () => void;
}

const FLIGHT_MS = 900;
const STAGGER_MS = 60;

interface CoinJitter {
  sx: number;
  sy: number;
  spin: number;
  size: number;
}

/** Neutral offsets for the first (pre-effect) paint — pure, no randomness. */
function zeroJitter(count: number): CoinJitter[] {
  return Array.from({ length: count }, () => ({ sx: 0, sy: 0, spin: 0, size: 1 }));
}

/**
 * Lightweight DOM coin burst — the native fallback for the WebGL coin stream
 * (the fullscreen Pixi canvas is disabled on native to avoid the Android
 * WebView compositor hole). Pure CSS transitions, finite, self-removing.
 */
export function DomCoinBurst({ source, target, count, onDone }: DomCoinBurstProps) {
  const [flying, setFlying] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Per-coin scatter + spin. Seeded in an effect (commit phase) — never during
  // render — so the randomness stays out of React's pure render path. Coins
  // burst from slightly different points and tumble on the way to the counter,
  // a little different every time (cosmetic only).
  const [jitter, setJitter] = useState<CoinJitter[]>(() => zeroJitter(count));

  useEffect(() => {
    setJitter(
      Array.from({ length: count }, () => ({
        sx: (Math.random() - 0.5) * 56,
        sy: (Math.random() - 0.5) * 56,
        spin: (Math.random() - 0.5) * 720,
        size: 0.8 + Math.random() * 0.6,
      })),
    );
    const raf = requestAnimationFrame(() => setFlying(true));
    const total = FLIGHT_MS + STAGGER_MS * count + 120;
    const timer = setTimeout(() => doneRef.current(), total);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [count]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9998]"
      aria-hidden="true"
      data-testid="dom-coin-burst"
    >
      {jitter.map((j, i) => {
        // Burst out from a scattered point, then converge on the counter.
        const px = (flying ? target.x : source.x + j.sx) - 8;
        const py = (flying ? target.y : source.y + j.sy) - 8;
        const rot = flying ? j.spin : 0;
        const scale = flying ? 0.55 : j.size;
        return (
          <span
            key={i}
            className="absolute left-0 top-0 w-4 h-4 rounded-full bg-neo-yellow border-2 border-black shadow-hard-sm"
            style={{
              transform: `translate(${px}px, ${py}px) rotate(${rot}deg) scale(${scale})`,
              opacity: flying ? 0 : 1,
              transition:
                `transform ${FLIGHT_MS}ms cubic-bezier(0.4,0,0.2,1) ${i * STAGGER_MS}ms,` +
                `opacity ${FLIGHT_MS}ms ease-in ${i * STAGGER_MS}ms`,
            }}
          />
        );
      })}
    </div>
  );
}

export default DomCoinBurst;
