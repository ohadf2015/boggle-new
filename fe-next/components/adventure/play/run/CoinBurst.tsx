'use client';

/**
 * Gold coins spray out of `fromRef` and arc into `toRef` (the gold counter).
 * Fixed-position overlay, measured once on mount. Reduced motion: no coins.
 */
import { useEffect, useLayoutEffect, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { COIN_ART } from './art';

interface Props {
  fromRef: RefObject<HTMLElement | null>;
  toRef: RefObject<HTMLElement | null>;
  count: number;
  /** Fired as each coin lands (sound / tick hook). */
  onLand?: (index: number) => void;
  onDone?: () => void;
}

interface Flight { x0: number; y0: number; dx: number; dy: number; spreadX: number; spreadY: number }

const STAGGER = 0.07;
const DURATION = 0.75;

export default function CoinBurst({ fromRef, toRef, count, onLand, onDone }: Props) {
  const reduce = useReducedMotion();
  const [flights, setFlights] = useState<Flight[] | null>(null);

  useLayoutEffect(() => {
    const a = fromRef.current?.getBoundingClientRect();
    const b = toRef.current?.getBoundingClientRect();
    if (!a || !b || reduce) { setFlights([]); return; }
    const x0 = a.left + a.width / 2;
    const y0 = a.top + a.height / 2;
    const tx = b.left + b.width / 2;
    const ty = b.top + b.height / 2;
    setFlights(Array.from({ length: count }, (_, i) => {
      const ang = (i / Math.max(1, count)) * Math.PI * 2 + 0.4;
      return { x0, y0, dx: tx - x0, dy: ty - y0, spreadX: Math.cos(ang) * (50 + (i % 3) * 18), spreadY: Math.sin(ang) * 40 - 60 };
    }));
  }, [fromRef, toRef, count, reduce]);

  useEffect(() => {
    if (!flights) return;
    const total = flights.length ? (STAGGER * (flights.length - 1) + DURATION) * 1000 : 0;
    const id = setTimeout(() => onDone?.(), total);
    return () => clearTimeout(id);
    // onDone identity is not a reason to replay the burst
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flights]);

  if (!flights?.length) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-70">
      {flights.map((f, i) => (
        <motion.img
          key={i}
          src={COIN_ART}
          alt=""
          className="absolute h-8 w-8 -ml-4 -mt-4 drop-shadow-[2px_2px_0_#000]"
          style={{ left: f.x0, top: f.y0 }}
          initial={{ x: 0, y: 0, scale: 0.4, opacity: 0 }}
          animate={{ x: [0, f.spreadX, f.dx], y: [0, f.spreadY, f.dy], scale: [0.4, 1.2, 0.6], opacity: [0, 1, 1], rotate: [0, 180, 360] }}
          transition={{ duration: DURATION, delay: i * STAGGER, times: [0, 0.35, 1], ease: 'easeIn' }}
          onAnimationComplete={() => onLand?.(i)}
        />
      ))}
    </div>
  );
}
