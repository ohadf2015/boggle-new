'use client';

import { useCallback } from 'react';
import gsap from 'gsap';
import { isReducedMotionPreferred } from '@/utils/accessibility';

export type JuiceTarget = Element | null | undefined;

export interface UseWordCraftJuice {
  tilePlace: (target: JuiceTarget) => void;
  invalidShake: (targets: JuiceTarget[]) => void;
  scorePop: (target: JuiceTarget, score: number) => void;
  botReveal: (targets: JuiceTarget[]) => void;
  rackSelect: (target: JuiceTarget) => void;
}

export function useWordCraftJuice(): UseWordCraftJuice {
  const tilePlace = useCallback((target: JuiceTarget) => {
    if (!target) return;
    if (isReducedMotionPreferred()) return;
    gsap.timeline().fromTo(
      target,
      { scale: 1.35, y: -10, opacity: 0.3 },
      { scale: 1, y: 0, opacity: 1, duration: 0.22, ease: 'back.out(2.4)' },
    );
  }, []);

  const invalidShake = useCallback((targets: JuiceTarget[]) => {
    const list = targets.filter(Boolean) as Element[];
    if (list.length === 0) return;
    if (isReducedMotionPreferred()) return;
    const tl = gsap.timeline();
    list.forEach((el) => {
      tl.fromTo(
        el,
        { x: 0 },
        { x: -8, duration: 0.05, repeat: 5, yoyo: true, ease: 'power1.inOut' },
        0,
      );
    });
  }, []);

  const scorePop = useCallback((target: JuiceTarget, _score: number) => {
    if (!target) return;
    if (isReducedMotionPreferred()) return;
    gsap
      .timeline()
      .fromTo(
        target,
        { scale: 0.6, y: 12, opacity: 0 },
        { scale: 1.25, y: -8, opacity: 1, duration: 0.18, ease: 'back.out(2.6)' },
      )
      .to(target, { scale: 1, y: 0, duration: 0.16, ease: 'power2.out' });
  }, []);

  const botReveal = useCallback((targets: JuiceTarget[]) => {
    const list = targets.filter(Boolean) as Element[];
    if (list.length === 0) return;
    if (isReducedMotionPreferred()) return;
    const tl = gsap.timeline();
    list.forEach((el, i) => {
      tl.fromTo(
        el,
        { rotationX: -90, opacity: 0, transformPerspective: 600 },
        { rotationX: 0, opacity: 1, duration: 0.32, ease: 'back.out(1.7)' },
        i * 0.08,
      );
    });
  }, []);

  const rackSelect = useCallback((target: JuiceTarget) => {
    if (!target) return;
    if (isReducedMotionPreferred()) return;
    gsap
      .timeline()
      .fromTo(
        target,
        { y: 0, scale: 1 },
        { y: -6, scale: 1.08, duration: 0.12, ease: 'back.out(2)' },
      )
      .to(target, { y: -3, scale: 1.04, duration: 0.16, ease: 'power2.out' });
  }, []);

  return { tilePlace, invalidShake, scorePop, botReveal, rackSelect };
}
