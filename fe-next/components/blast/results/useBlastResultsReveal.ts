'use client';

import { useEffect, useRef, type RefObject } from 'react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { fireConfetti, VICTORY_COLORS } from '@/utils/confettiUtils';
import { prefersStaticFullscreenOverlay } from '@/lib/native/webViewLayerFlash';

gsap.registerPlugin(useGSAP);

interface RevealOptions {
  score: number;
  locale: string;
  confetti: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Sequenced results reveal over `[data-reveal]` children of `scope`.
 * React renders the final state; this only tweens transforms into it, so
 * reduced motion, SSR and tests all see the finished screen.
 */
export function useBlastResultsReveal(scope: RefObject<HTMLElement | null>, opts: RevealOptions) {
  // Read at call time so a late personal best does not replay the whole reveal.
  const confettiRef = useRef(opts.confetti);
  useEffect(() => {
    confettiRef.current = opts.confetti;
  }, [opts.confetti]);
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(scope);
      const has = (sel: string) => q(sel).length > 0;
      const tl = gsap.timeline({ defaults: { ease: 'back.out(2)' } });

      if (has('[data-reveal="mascot"]')) {
        tl.from(q('[data-reveal="mascot"]'), { scale: 0.3, rotation: -14, y: 30, duration: 0.55 }, 0);
      }
      if (has('[data-reveal="headline"]')) {
        tl.from(q('[data-reveal="headline"]'), { y: -24, scale: 0.7, duration: 0.4 }, 0.1);
      }

      const scoreEl = q('[data-reveal="score"]')[0];
      if (scoreEl && opts.score > 0) {
        const fmt = new Intl.NumberFormat(opts.locale);
        const counter = { v: 0 };
        let lastTick = 0;
        scoreEl.textContent = fmt.format(0);
        tl.to(counter, {
          v: opts.score,
          duration: Math.min(1.4, 0.6 + opts.score / 4000),
          ease: 'power2.out',
          onUpdate: () => {
            scoreEl.textContent = fmt.format(Math.round(counter.v));
            const tick = Math.floor((counter.v / opts.score) * 10);
            if (tick !== lastTick) {
              lastTick = tick;
              gsap.fromTo(scoreEl, { scale: 1.08 }, { scale: 1, duration: 0.12, ease: 'power1.out', overwrite: true });
            }
          },
        }, 0.2);
      }

      if (has('[data-reveal="node"]')) {
        tl.from(q('[data-reveal="node"]'), { y: 18, scale: 0.4, duration: 0.32, stagger: 0.09 }, 0.35);
      }
      if (has('[data-reveal="meter"]')) {
        tl.from(q('[data-reveal="meter"]'), { scaleX: 0, duration: 0.6, ease: 'power2.out' }, '<0.2');
      }
      if (has('[data-reveal="loot"]')) {
        tl.from(q('[data-reveal="loot"]'), { y: 20, scale: 0.6, duration: 0.35, stagger: 0.08 }, '>-0.2');
      }
      q('[data-countup]').forEach((el: HTMLElement) => {
        const target = Number(el.dataset.countup);
        if (!(target > 0)) return;
        const fmt = new Intl.NumberFormat(opts.locale);
        const c = { v: 0 };
        el.textContent = fmt.format(0);
        tl.to(c, { v: target, duration: 0.7, ease: 'power2.out', onUpdate: () => { el.textContent = fmt.format(Math.round(c.v)); } }, '<0.1');
      });
      if (has('[data-reveal="tile"]')) {
        tl.from(q('[data-reveal="tile"]'), { y: -30, rotation: () => gsap.utils.random(-15, 15), duration: 0.3, stagger: 0.05 }, '>-0.2');
      }
      if (has('[data-reveal="badge-new"]')) {
        tl.from(q('[data-reveal="badge-new"]'), { scale: 0, rotation: -20, duration: 0.4, ease: 'back.out(3)', stagger: 0.12 }, '>-0.1');
      }
      if (has('[data-reveal="chip"]')) {
        tl.from(q('[data-reveal="chip"]'), { y: -36, scale: 0, rotation: () => gsap.utils.random(-12, 12), duration: 0.45, stagger: 0.07 }, '>-0.15');
      }
      if (has('[data-reveal="coin"]')) {
        tl.from(q('[data-reveal="coin"]'), {
          y: () => gsap.utils.random(-140, -60), x: () => gsap.utils.random(-50, 50), scale: 0, rotation: () => gsap.utils.random(-180, 180),
          duration: 0.7, ease: 'bounce.out', stagger: 0.05,
        }, '<0.2');
      }
      if (has('[data-reveal="diamond"]')) {
        tl.from(q('[data-reveal="diamond"]'), {
          x: 0, y: 0, scale: 0, rotation: 90, duration: 0.5, ease: 'expo.out', stagger: 0.04,
        }, '<0.1');
      }
      if (has('[data-reveal="medal"]')) {
        gsap.set(q('[data-reveal="medal"]'), { scale: 0 });
        tl.fromTo(q('[data-reveal="medal"]'), { scale: 2.6, rotation: -30, y: -40 }, { scale: 1, rotation: 0, y: 0, duration: 0.35, ease: 'power4.in', immediateRender: false }, '>-0.1')
          .to(q('[data-reveal="hero-card"]'), { x: 4, duration: 0.05, yoyo: true, repeat: 3, ease: 'none' })
          .set(q('[data-reveal="hero-card"]'), { x: 0 });
      }
      if (has('[data-reveal="star"]')) {
        gsap.set(q('[data-reveal="star"]'), { scale: 0 });
        tl.to(q('[data-reveal="star"]'), { scale: 1, rotation: 360, duration: 0.35, ease: 'back.out(4)', stagger: 0.12 }, '>-0.05');
      }
      if (has('[data-reveal="banner"]')) {
        tl.from(q('[data-reveal="banner"]'), { scale: 0, rotation: -25, duration: 0.45, ease: 'back.out(3)' }, '>-0.05');
      }
      if (!prefersStaticFullscreenOverlay()) {
        tl.call(() => {
          if (!confettiRef.current) return;
          fireConfetti({ particleCount: 90, spread: 80, startVelocity: 42, origin: { y: 0.3 }, colors: VICTORY_COLORS });
        });
      }
      if (has('[data-reveal="goal"]')) {
        tl.from(q('[data-reveal="goal"]'), { y: 28, scale: 0.9, duration: 0.4 }, '>-0.1');
      }
      if (has('[data-reveal="cta"]')) {
        tl.fromTo(q('[data-reveal="cta"]'), { scale: 1 }, { scale: 1.05, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' });
      }
    },
    { scope, dependencies: [opts.score] },
  );
}
