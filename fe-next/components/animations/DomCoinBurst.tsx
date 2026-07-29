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

/**
 * Lightweight DOM coin burst — the native fallback for the WebGL coin stream
 * (the fullscreen Pixi canvas is disabled on native to avoid the Android
 * WebView compositor hole). Pure CSS transitions, finite, self-removing.
 */
export function DomCoinBurst({ source, target, count, onDone }: DomCoinBurstProps) {
  const [flying, setFlying] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
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
      {Array.from({ length: count }).map((_, i) => {
        const px = (flying ? target.x : source.x) - 8;
        const py = (flying ? target.y : source.y) - 8;
        return (
          <span
            key={i}
            className="absolute left-0 top-0 w-4 h-4 rounded-full bg-neo-yellow border-2 border-black shadow-hard-sm"
            style={{
              transform: `translate(${px}px, ${py}px) scale(${flying ? 0.6 : 1})`,
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
