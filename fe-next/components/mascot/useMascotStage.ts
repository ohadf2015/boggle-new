'use client';

import { useEffect, useState } from 'react';
import { gagStageScale, pickStage } from '@/lib/mascot/stage';

export interface MascotStage {
  el: HTMLElement;
  scale: number;
}

/** Picks the first of up to three host stages that is on screen and tall enough, re-measured as the layout changes. */
export function useMascotStage(stages: ReadonlyArray<HTMLElement | null> | undefined): MascotStage | null {
  const [stage, setStage] = useState<MascotStage | null>(null);
  const [a = null, b = null, c = null] = stages ?? [];

  useEffect(() => {
    const els = [a, b, c].filter((el): el is HTMLElement => !!el);
    if (els.length === 0) {
      setStage(null);
      return;
    }
    const measure = () => {
      const boxes = els.map((el) => el.getBoundingClientRect());
      const i = pickStage(boxes);
      setStage((prev) => {
        if (i < 0) return null;
        const scale = gagStageScale(boxes[i].height);
        return prev?.el === els[i] && prev.scale === scale ? prev : { el: els[i], scale };
      });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    for (const el of els) observer?.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [a, b, c]);

  return stage;
}
