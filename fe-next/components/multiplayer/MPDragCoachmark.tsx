'use client';

import React, { useEffect, useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { cn } from '@/lib/utils';
import { isReducedMotionPreferred } from '@/utils/accessibility';

interface Props {
  /** Translation function. */
  t: (key: string, params?: Record<string, string | number>) => string;
  /** Called when user dismisses (button click or explicit). */
  onDismiss: () => void;
  /** CSS selector for letter targets inside the parent container. */
  targetSelector?: string;
  /** Override reduced-motion detection (mostly for tests). */
  reducedMotion?: boolean;
  /** Brand accent color used for halo + cursor wrist cuff glow. */
  accent?: 'lime' | 'pink' | 'cyan';
}

const DEFAULT_TARGET = '[data-wheel-letter]:not([disabled])';

/**
 * MP FTUE overlay. Floats inside its parent (the wheel container is
 * `position: relative`). Picks 3 letter targets, animates a kawaii
 * cursor sticker along their centers with a GSAP timeline + dotted
 * trail + neon halos. Pulsing label below.
 *
 * Self-positioning: rect-relative to the parent container, so works
 * across breakpoints + RTL.
 */
export const MPDragCoachmark: React.FC<Props> = ({
  t,
  onDismiss,
  targetSelector = DEFAULT_TARGET,
  reducedMotion,
  accent = 'lime',
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const cursorRef = useRef<HTMLImageElement>(null);
  const trailRefs = useRef<Array<HTMLDivElement | null>>([]);
  const haloRefs = useRef<Array<HTMLDivElement | null>>([]);

  const accentClass =
    accent === 'pink' ? 'bg-neo-pink text-neo-white border-neo-black'
    : accent === 'cyan' ? 'bg-neo-cyan text-neo-black border-neo-black'
    : 'bg-neo-lime text-neo-black border-neo-black';
  const haloClass =
    accent === 'pink' ? 'border-neo-pink shadow-[0_0_24px_rgba(255,20,147,0.6)]'
    : accent === 'cyan' ? 'border-neo-cyan shadow-[0_0_24px_rgba(0,255,255,0.6)]'
    : 'border-neo-lime shadow-[0_0_24px_rgba(191,255,0,0.6)]';

  useLayoutEffect(() => {
    const reduce = reducedMotion ?? isReducedMotionPreferred();
    if (reduce) return;
    const root = rootRef.current;
    const cursor = cursorRef.current;
    if (!root || !cursor) return;

    const parent = root.parentElement;
    if (!parent) return;

    const buttons = Array.from(
      parent.querySelectorAll<HTMLElement>(targetSelector),
    );
    if (buttons.length < 2) return;

    const parentRect = parent.getBoundingClientRect();
    // pick up to 3 targets — start, middle, end of available
    const picks = [
      buttons[0],
      buttons[Math.floor(buttons.length / 2)] ?? buttons[0],
      buttons[buttons.length - 1] ?? buttons[0],
    ];
    const points = picks.map(el => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - parentRect.left,
        y: r.top + r.height / 2 - parentRect.top,
      };
    });

    // Position halos at the 3 points
    haloRefs.current.forEach((h, i) => {
      if (!h || !points[i]) return;
      h.style.left = `${points[i].x}px`;
      h.style.top = `${points[i].y}px`;
    });

    const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.8 });
    // Start state: cursor at first point, invisible
    tl.set(cursor, { x: points[0].x, y: points[0].y, opacity: 0, scale: 0.6 })
      .to(cursor, { opacity: 1, scale: 1, duration: 0.35, ease: 'back.out(2)' });

    // Halo pulse on first point
    if (haloRefs.current[0]) {
      tl.fromTo(
        haloRefs.current[0],
        { scale: 0.4, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(2)' },
        '<',
      ).to(haloRefs.current[0], { opacity: 0, duration: 0.4 }, '+=0.1');
    }

    // Cursor sweeps to point 2 and 3 with halo pulses + trail dots
    for (let i = 1; i < points.length; i++) {
      const dur = 0.6;
      tl.to(cursor, {
        x: points[i].x,
        y: points[i].y,
        duration: dur,
        ease: 'power2.inOut',
      });
      const halo = haloRefs.current[i];
      if (halo) {
        tl.fromTo(
          halo,
          { scale: 0.4, opacity: 0 },
          { scale: 1, opacity: 1, duration: 0.3, ease: 'back.out(2)' },
          '<+0.2',
        ).to(halo, { opacity: 0, duration: 0.4 }, '+=0.1');
      }
      // Trail dot between previous and current
      const trail = trailRefs.current[i - 1];
      if (trail) {
        const midX = (points[i - 1].x + points[i].x) / 2;
        const midY = (points[i - 1].y + points[i].y) / 2;
        tl.set(trail, { left: midX, top: midY, opacity: 0 }, '<')
          .to(trail, { opacity: 0.8, scale: 1.2, duration: 0.2 }, '<')
          .to(trail, { opacity: 0, scale: 0.6, duration: 0.45 }, '>');
      }
    }

    // Fade out before repeat
    tl.to(cursor, { opacity: 0, scale: 0.7, duration: 0.3, ease: 'power1.in' }, '+=0.2');

    return () => { tl.kill(); };
  }, [targetSelector, reducedMotion]);

  // Esc dismisses
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onDismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={t('wheelRush.ftue.dragLabel')}
      aria-modal="false"
      className="pointer-events-none absolute inset-0 z-30"
      data-testid="mp-drag-coachmark"
    >
      {/* Soft veil to focus attention without blocking the wheel touches */}
      <div className="absolute inset-0 bg-neo-navy/30" aria-hidden />

      {/* Halos at letter targets */}
      {[0, 1, 2].map(i => (
        <div
          key={i}
          ref={el => { haloRefs.current[i] = el; }}
          aria-hidden
          className={cn(
            'absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full border-4 opacity-0',
            haloClass,
          )}
          style={{ left: 0, top: 0 }}
        />
      ))}

      {/* Dotted trail */}
      {[0, 1].map(i => (
        <div
          key={`t-${i}`}
          ref={el => { trailRefs.current[i] = el; }}
          aria-hidden
          className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-neo-cream opacity-0 shadow-[0_0_12px_rgba(255,254,240,0.8)]"
          style={{ left: 0, top: 0 }}
        />
      ))}

      {/* Cursor sticker — plain <img> intentional: GSAP writes inline transforms
          directly on the element; next/image's wrapper would be the transform
          target instead and complicate the timeline. Asset is already optimised. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={cursorRef}
        src="/ftue/cursor-pointer.png"
        alt={t('wheelRush.ftue.dragLabel')}
        draggable={false}
        className="absolute -translate-x-3 -translate-y-3 w-16 h-16 select-none drop-shadow-[2px_2px_0_#000]"
        style={{ left: 0, top: 0, opacity: reducedMotion ? 1 : 0 }}
      />

      {/* Bottom label pill + dismiss */}
      <div className="absolute bottom-2 inset-x-0 flex flex-col items-center gap-2 pointer-events-auto">
        <div
          className={cn(
            'px-4 py-2 rounded-neo border-neo-thick font-neo-display font-bold text-sm sm:text-base shadow-hard',
            accentClass,
            'animate-neo-wobble',
          )}
        >
          {t('wheelRush.ftue.dragLabel')}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="px-3 py-1 rounded-neo border-2 border-neo-cream/40 bg-neo-navy/80 text-neo-cream text-xs font-neo-display font-bold hover:bg-neo-navy"
        >
          {t('wheelRush.ftue.dismiss')}
        </button>
      </div>
    </div>
  );
};
