'use client';

import { useCallback } from 'react';
import { gsap } from 'gsap';
import { isReducedMotionPreferred } from '@/utils/accessibility';
import { JOKER_GLYPH } from '@/lib/word-craft/blankAssign';

export type JuiceTarget = Element | null | undefined;

export interface UseWordCraftJuice {
  tilePlace: (target: JuiceTarget) => void;
  invalidShake: (targets: JuiceTarget[]) => void;
  scorePop: (target: JuiceTarget, score: number) => void;
  botReveal: (targets: JuiceTarget[]) => void;
  rackSelect: (target: JuiceTarget) => void;
  /** Player committed a word — staggered "thump" reveal across the placed tiles */
  playerCommitReveal: (targets: JuiceTarget[]) => void;
  /**
   * Tap-to-place arc: a transient ghost tile flies on a parabolic curve
   * from the rack tile to the target board cell. Kills the "indirect feel"
   * of two-tap placement by visualising the actual motion.
   */
  arcTilePlace: (fromEl: JuiceTarget, toEl: JuiceTarget, letter: string, value: number) => void;
  /**
   * Refill flourish: newly-drawn rack tiles fly in from the sack icon, so the
   * bag visibly "feeds" your hand instead of tiles blinking into existence.
   */
  drawFromSack: (sackEl: JuiceTarget, rackTileEls: JuiceTarget[]) => void;
  /** A joker just got its letter — pop the tile and scatter a few sparkles. */
  jokerSparkle: (target: JuiceTarget) => void;
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

  const playerCommitReveal = useCallback((targets: JuiceTarget[]) => {
    const list = targets.filter(Boolean) as Element[];
    if (list.length === 0) return;
    if (isReducedMotionPreferred()) return;
    // Hard "thump" — tiles drop in with a scale spike + downward overshoot,
    // staggered left-to-right. Compositor-only (transform) so it stays 60fps.
    const tl = gsap.timeline();
    list.forEach((el, i) => {
      tl.fromTo(
        el,
        { scale: 1.35, y: -10 },
        { scale: 1, y: 0, duration: 0.28, ease: 'back.out(2.2)' },
        i * 0.06,
      );
    });
  }, []);

  const arcTilePlace = useCallback(
    (fromEl: JuiceTarget, toEl: JuiceTarget, letter: string, value: number) => {
      if (!fromEl || !toEl) return;
      if (isReducedMotionPreferred()) return;
      if (typeof document === 'undefined') return;

      const fromRect = (fromEl as HTMLElement).getBoundingClientRect();
      const toRect = (toEl as HTMLElement).getBoundingClientRect();
      const startX = fromRect.left + fromRect.width / 2;
      const startY = fromRect.top + fromRect.height / 2;
      const endX = toRect.left + toRect.width / 2;
      const endY = toRect.top + toRect.height / 2;

      const ghost = document.createElement('div');
      ghost.setAttribute('aria-hidden', 'true');
      ghost.dataset.wcArcGhost = 'true';
      ghost.style.cssText = [
        'position:fixed',
        `left:${startX}px`,
        `top:${startY}px`,
        'transform:translate(-50%,-50%) rotate(-4deg)',
        'pointer-events:none',
        'z-index:60',
        // dimensions match a rack tile so the visual is convincing
        'width:3.5rem',
        'height:4rem',
        'border-radius:8px',
        'border:3px solid #000',
        'background:#FFFEF0',
        'color:#1a1a2e',
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'box-shadow:4px 4px 0 0 #000',
        'font-family:var(--font-fredoka), system-ui, sans-serif',
        'font-weight:800',
        'font-size:1.75rem',
      ].join(';');

      const glyph = document.createElement('span');
      glyph.textContent = letter === '_' ? JOKER_GLYPH : letter;
      ghost.appendChild(glyph);

      const valueChip = document.createElement('span');
      valueChip.textContent = String(value);
      valueChip.style.cssText = [
        'position:absolute',
        'bottom:4px',
        'right:6px',
        'font-size:10px',
        'opacity:0.6',
        'font-weight:700',
      ].join(';');
      ghost.appendChild(valueChip);

      document.body.appendChild(ghost);

      const dx = endX - startX;
      const dy = endY - startY;
      const peakLift = Math.min(120, 40 + Math.abs(dx) * 0.18);

      gsap.to(ghost, {
        keyframes: [
          { x: dx * 0.5, y: dy * 0.4 - peakLift, scale: 1.18, rotation: -8, duration: 0.14 },
          { x: dx, y: dy, scale: 0.85, rotation: 4, duration: 0.18 },
        ],
        ease: 'power2.out',
        onComplete: () => {
          ghost.remove();
        },
      });
    },
    [],
  );

  const drawFromSack = useCallback((sackEl: JuiceTarget, rackTileEls: JuiceTarget[]) => {
    if (!sackEl) return;
    const tiles = rackTileEls.filter(Boolean) as Element[];
    if (tiles.length === 0) return;
    if (isReducedMotionPreferred()) return;

    const sackRect = (sackEl as HTMLElement).getBoundingClientRect();
    const sackCx = sackRect.left + sackRect.width / 2;
    const sackCy = sackRect.top + sackRect.height / 2;

    // Animate the REAL rack tiles in from the sack's position (no ghosts):
    // each tile starts shifted toward the sack, tiny + spun, then snaps home.
    const tl = gsap.timeline();
    tiles.forEach((el, i) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const dx = sackCx - (r.left + r.width / 2);
      const dy = sackCy - (r.top + r.height / 2);
      tl.fromTo(
        el,
        { x: dx, y: dy, scale: 0.3, rotation: -20, opacity: 0 },
        { x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, duration: 0.34, ease: 'back.out(1.7)' },
        i * 0.07,
      );
    });
  }, []);

  const jokerSparkle = useCallback((target: JuiceTarget) => {
    if (!target) return;
    if (isReducedMotionPreferred()) return;

    // Pop the assigned tile (testable timeline on the real element).
    const tl = gsap.timeline();
    tl.fromTo(
      target,
      { scale: 0.7, rotation: -8 },
      { scale: 1.18, rotation: 0, duration: 0.16, ease: 'back.out(3)' },
    ).to(target, { scale: 1, duration: 0.14, ease: 'power2.out' });

    // Best-effort sparkle particles around the tile. Transient DOM, cleaned up
    // on a timer so it never leaks even if the tween is interrupted.
    if (typeof document === 'undefined') return;
    const rect = (target as HTMLElement).getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const colors = ['#BFFF00', '#00FFFF', '#FF1493', '#FFE135'];
    const sparkTl = gsap.timeline();
    for (let i = 0; i < 6; i++) {
      const dot = document.createElement('div');
      dot.setAttribute('aria-hidden', 'true');
      dot.dataset.wcJokerSpark = 'true';
      dot.style.cssText = [
        'position:fixed',
        `left:${cx}px`,
        `top:${cy}px`,
        'width:8px',
        'height:8px',
        'border-radius:9999px',
        'border:2px solid #000',
        `background:${colors[i % colors.length]}`,
        'pointer-events:none',
        'z-index:61',
        'transform:translate(-50%,-50%)',
      ].join(';');
      document.body.appendChild(dot);
      const angle = (Math.PI * 2 * i) / 6;
      const dist = 26 + (i % 2) * 10;
      sparkTl.fromTo(
        dot,
        { x: 0, y: 0, scale: 1, opacity: 1 },
        {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
          scale: 0.2,
          opacity: 0,
          duration: 0.5,
          ease: 'power2.out',
        },
        0,
      );
      window.setTimeout(() => dot.remove(), 600);
    }
  }, []);

  return {
    tilePlace,
    invalidShake,
    scorePop,
    botReveal,
    rackSelect,
    playerCommitReveal,
    arcTilePlace,
    drawFromSack,
    jokerSparkle,
  };
}
