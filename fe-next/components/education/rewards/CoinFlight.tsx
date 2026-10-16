'use client';

/**
 * Coins spray out of `fromRef` and arc into the node that holds the number they
 * pay into. The one coin flight for edu rewards (round chest, practice XP, duels).
 *
 * The landing node is `toRef`, else the first match of `toSelector`. If neither
 * is on screen the coins land at the top centre instead of silently not flying.
 * Callers gate it: pass `count={0}` under reduced motion. Transform/opacity only.
 */
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { m } from 'framer-motion';
import { CoinArt } from '@/components/ui/CoinArt';

export interface CoinFlightProps {
  count: number;
  fromRef: RefObject<HTMLElement | null>;
  toRef?: RefObject<HTMLElement | null>;
  toSelector?: string;
  /** Fired once, after the last coin lands. */
  onDone?: () => void;
  size?: number;
  tokenTestId?: string;
  /** Time between two coins leaving, and one coin's travel time, so a caller can tick a counter in step. */
  staggerMs?: number;
  travelMs?: number;
}

interface Flight {
  x0: number;
  y0: number;
  dx: number;
  dy: number;
  kx: number;
  ky: number;
}

function centre(node: Element | null | undefined) {
  if (!node) return null;
  const r = node.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export default function CoinFlight({
  count,
  fromRef,
  toRef,
  toSelector,
  onDone,
  size = 28,
  tokenTestId = 'coin-flight-token',
  staggerMs = 60,
  travelMs = 700,
}: CoinFlightProps) {
  const [flights, setFlights] = useState<Flight[] | null>(null);

  useLayoutEffect(() => {
    if (count <= 0) {
      setFlights(null);
      return;
    }
    const from = centre(fromRef.current);
    if (!from) return;
    const landing = toRef?.current ?? (toSelector ? document.querySelector(toSelector) : null);
    const to = centre(landing) ?? { x: window.innerWidth / 2, y: 24 };
    setFlights(
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + 0.4;
        return {
          x0: from.x,
          y0: from.y,
          dx: to.x - from.x,
          dy: to.y - from.y,
          kx: Math.cos(angle) * (48 + (i % 3) * 18),
          ky: Math.sin(angle) * 36 - 64,
        };
      })
    );
  }, [count, fromRef, toRef, toSelector]);

  useEffect(() => {
    if (!flights?.length) return;
    const id = setTimeout(() => {
      setFlights(null);
      onDone?.();
    }, staggerMs * (flights.length - 1) + travelMs);
    return () => clearTimeout(id);
    // onDone identity is not a reason to replay the flight
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights]);

  if (!flights?.length || typeof document === 'undefined') return null;
  // Portaled: a transformed ancestor would re-anchor `fixed` and throw the coins off their measured target.
  return createPortal(
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[110]">
      {flights.map((f, i) => (
        <m.div
          key={i}
          data-testid={tokenTestId}
          className="absolute"
          style={{ left: f.x0 - size / 2, top: f.y0 - size / 2, width: size, height: size }}
          initial={{ x: 0, y: 0, scale: 0.5, opacity: 0 }}
          animate={{ x: [0, f.kx, f.dx, f.dx], y: [0, f.ky, f.dy, f.dy], scale: [0.5, 1.15, 0.6, 0.4], opacity: [0, 1, 1, 0] }}
          transition={{ duration: travelMs / 1000, delay: (i * staggerMs) / 1000, times: [0, 0.35, 0.9, 1], ease: 'easeIn' }}
        >
          <CoinArt size={size} />
        </m.div>
      ))}
    </div>,
    document.body
  );
}
