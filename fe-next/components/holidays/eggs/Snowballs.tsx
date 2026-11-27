'use client';

import { useEffect, useState } from 'react';
import { SNOWBALL_EVENT, prefersReducedMotion } from './eggEvents';

const BALLS = [
  { x0: '-10vw', y0: '70vh', x1: '70vw', y1: '25vh', delay: 0 },
  { x0: '110vw', y0: '60vh', x1: '20vw', y1: '30vh', delay: 0.15 },
  { x0: '-10vw', y0: '40vh', x1: '55vw', y1: '60vh', delay: 0.3 },
  { x0: '110vw', y0: '80vh', x1: '35vw', y1: '45vh', delay: 0.45 },
  { x0: '50vw', y0: '110vh', x1: '80vw', y1: '20vh', delay: 0.6 },
  { x0: '-10vw', y0: '90vh', x1: '45vw', y1: '35vh', delay: 0.75 },
];

export default function Snowballs() {
  const [round, setRound] = useState(0);

  useEffect(() => {
    const on = () => !prefersReducedMotion() && setRound((r) => r + 1);
    window.addEventListener(SNOWBALL_EVENT, on);
    return () => window.removeEventListener(SNOWBALL_EVENT, on);
  }, []);

  useEffect(() => {
    if (!round) return;
    const id = setTimeout(() => setRound(0), 2200);
    return () => clearTimeout(id);
  }, [round]);

  if (!round) return null;
  return (
    <div key={round} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[88] overflow-hidden">
      {BALLS.map((b, i) => (
        <span
          key={i}
          className="holiday-snowball absolute left-0 top-0 size-10 rounded-full border-2 border-black bg-neo-holiday-snow shadow-hard-sm"
          style={{
            animationDelay: `${b.delay}s`,
            ['--hfx-x0' as string]: b.x0,
            ['--hfx-y0' as string]: b.y0,
            ['--hfx-x1' as string]: b.x1,
            ['--hfx-y1' as string]: b.y1,
          }}
        />
      ))}
    </div>
  );
}
