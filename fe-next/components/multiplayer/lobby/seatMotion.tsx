'use client';

import { useRef, type CSSProperties } from 'react';
import { jitter, sign } from '@/lib/animation/variety';
import styles from './lobby.module.css';

/** Seeded from the seat id, so a seat keeps its tilt and bob phase across re-renders and hydration. */
function seatRand(id: string): () => number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h >>>= 0) % 10000) / 10000;
  };
}

export function seatMotionStyle(id: string): CSSProperties {
  const rand = seatRand(id);
  return {
    '--seat-tilt': `${(sign(rand) * jitter(7, 3, rand)).toFixed(1)}deg`,
    '--bob-delay': `-${(rand() * 2.4).toFixed(2)}s`,
  } as CSSProperties;
}

/** Ids that were not seated when the roster mounted: the ones that just walked in. */
export function useArrivals(ids: string[]): Set<string> {
  const first = useRef<Set<string> | null>(null);
  if (first.current === null) first.current = new Set(ids);
  const seen = first.current;
  return new Set(ids.filter((id) => !seen.has(id)));
}

const SPARKS = [0, 60, 120, 180, 240, 300];

/** One-shot confetti ring around a seat that just filled. Callers skip it under reduced motion. */
export function JoinBurst() {
  return (
    <span data-testid="join-burst" aria-hidden="true" className="pointer-events-none absolute inset-0">
      {SPARKS.map((deg, i) => (
        <i
          key={deg}
          className={styles.spark}
          style={{ '--spark-angle': `${deg}deg`, '--spark-tone': `var(--neo-${['lime', 'pink', 'cyan', 'yellow'][i % 4]})` } as CSSProperties}
        />
      ))}
    </span>
  );
}
