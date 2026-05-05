'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { createPortal } from 'react-dom';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import shellStyles from './BlastModalShell.module.css';

export type ModalAccent = 'lime' | 'cyan';

const ACCENTS: Record<ModalAccent, { base: string; light: string; glow: string; particle: number }> = {
  lime: { base: '#bfff00', light: '#dfff80', glow: 'rgba(191,255,0,0.55)', particle: 0xbfff00 },
  cyan: { base: '#00ffff', light: '#a8feff', glow: 'rgba(0,255,255,0.55)', particle: 0x00ffff },
};

export interface BlastModalShellProps {
  isOpen: boolean;
  accent: ModalAccent;
  /** lucide icon component to render inside the orb. */
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  title: React.ReactNode;
  body: React.ReactNode;
  cta: React.ReactNode;
  decline?: React.ReactNode;
  /** Bottom-right sticker (e.g., mascot). Optional. */
  sticker?: React.ReactNode;
  /** Test/storybook escape hatch — disables portal so JSDOM can find nodes. */
  disablePortal?: boolean;
  /** Triggered to fire pixi popup-burst at orb-centre when shell mounts. */
  fireBurst?: (x: number, y: number, colour: number) => void;
  testId?: string;
}

/**
 * Shared modal scaffold for blast popups. Both BlastContinueModal and
 * BlastRetryWaveModal render through this. Owns its own GSAP entrance
 * timeline (6-step stagger) + orb mount-burst.
 */
export function BlastModalShell({
  isOpen, accent, Icon, title, body, cta, decline, sticker, disablePortal, fireBurst, testId,
}: BlastModalShellProps) {
  const reducedMotion = usePrefersReducedMotion();
  const backdropRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const orbRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const declineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Fire popup-burst at orb-centre when the modal mounts. Decoupled from the
    // GSAP timeline so it still runs in test/reduced-motion contexts (GSAP's
    // ticker doesn't advance in jsdom).
    if (fireBurst && orbRef.current) {
      const rect = orbRef.current.getBoundingClientRect();
      const burstDelay = reducedMotion ? 0 : 200; // sync with orb appearance in animated path
      const t = window.setTimeout(() => {
        if (!orbRef.current) return;
        fireBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, ACCENTS[accent].particle);
      }, burstDelay);
      if (reducedMotion) {
        // No animation — also short-circuit timeline below
        return () => { window.clearTimeout(t); };
      }
    }

    if (reducedMotion) return;
    const tl = gsap.timeline();
    tl.fromTo(backdropRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0);
    tl.fromTo(frameRef.current, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.32, ease: 'back.out(1.6)' }, 0.05);
    tl.fromTo(orbRef.current, { scale: 0 }, { scale: 1, duration: 0.38, ease: 'elastic.out(1, 0.5)' }, 0.20);
    tl.fromTo(titleRef.current, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.22, ease: 'power2.out' }, 0.30);
    tl.fromTo(bodyRef.current, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.20 }, 0.40);
    tl.fromTo(ctaRef.current, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.24, ease: 'back.out(2)' }, 0.50);
    if (declineRef.current) {
      tl.fromTo(declineRef.current, { opacity: 0 }, { opacity: 1, duration: 0.18 }, 0.55);
    }
    return () => { tl.kill(); };
  }, [isOpen, accent, reducedMotion, fireBurst]);

  if (!isOpen) return null;

  const accentVars = {
    '--accent-base': ACCENTS[accent].base,
    '--accent-light': ACCENTS[accent].light,
    '--accent-glow': ACCENTS[accent].glow,
  } as React.CSSProperties;

  const node = (
    <div
      ref={backdropRef}
      data-testid={testId}
      className={shellStyles.backdrop}
      style={accentVars}
    >
      <div ref={frameRef} className={shellStyles.frame}>
        <div ref={orbRef} className={shellStyles.orb}>
          <span aria-hidden="true" className={shellStyles.orbRing} />
          <Icon className={shellStyles.orbIcon} strokeWidth={3.5} />
        </div>
        <div ref={titleRef} className={shellStyles.title}>{title}</div>
        <div ref={bodyRef} className={shellStyles.body}>{body}</div>
        <div ref={ctaRef} className={shellStyles.cta}>{cta}</div>
        {decline && <div ref={declineRef} className={shellStyles.decline}>{decline}</div>}
        {sticker && <div className={shellStyles.sticker}>{sticker}</div>}
      </div>
    </div>
  );

  if (disablePortal || typeof document === 'undefined') return node;
  return createPortal(node, document.body);
}

export default BlastModalShell;
