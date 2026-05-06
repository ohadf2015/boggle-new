'use client';

import { useEffect, useRef } from 'react';
import { createPopBurst, type PopBurstHandle } from './effects/blastPopBurst';

export interface PopBurstEvent {
  id: string;
  startX: number;
  startY: number;
  color: string;
}

interface BlastPopBurstProps {
  bursts: PopBurstEvent[];
  onComplete: (id: string) => void;
}

function PopBurstChip({
  burst,
  onComplete,
}: {
  burst: PopBurstEvent;
  onComplete: (id: string) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const handleRef = useRef<PopBurstHandle | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    handleRef.current = createPopBurst({
      el: ref.current,
      color: burst.color,
      onComplete: () => onComplete(burst.id),
    });
    return () => {
      handleRef.current?.dispose();
    };
  }, [burst.color, burst.id, onComplete]);

  return (
    <div
      ref={ref}
      data-testid="blast-pop-burst"
      className="absolute pointer-events-none rounded-full"
      style={{
        left: `${burst.startX}%`,
        top: `${burst.startY}%`,
        width: '3.6cqw',
        height: '3.6cqw',
        minWidth: 18,
        minHeight: 18,
        background: `radial-gradient(circle, ${burst.color} 0%, ${burst.color}66 60%, transparent 80%)`,
        transform: 'translate(-50%, -50%)',
        zIndex: 49,
        opacity: 0,
        willChange: 'transform, opacity',
      }}
      aria-hidden="true"
    />
  );
}

export function BlastPopBurst({ bursts, onComplete }: BlastPopBurstProps) {
  return (
    <>
      {bursts.map(b => (
        <PopBurstChip key={b.id} burst={b} onComplete={onComplete} />
      ))}
    </>
  );
}
