'use client';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { magneticOffset } from '@/lib/animation/scrollFx';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/**
 * Scroll/pointer effects layer for the ES multiplayer landing page.
 *
 * Attaches behaviour to elements marked with `data-*` attributes in the
 * server-rendered markup, so the page works fully without JS and only gains
 * motion as progressive enhancement. Renders nothing.
 *
 *  - `[data-parallax-speed]`  -> scrub-linked vertical parallax (px of travel)
 *  - `[data-hero-tile]`       -> tiles drift up + rotate as the hero scrolls out
 *  - `[data-magnetic]`        -> CTA leans toward the cursor (fine pointers only)
 *
 * Everything is wrapped in `gsap.matchMedia` so it self-disables under
 * `prefers-reduced-motion` and the magnetic pull only runs for real cursors.
 */
export function PageScrollFx() {
  useGSAP(() => {
    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      // Depth parallax on decorative blobs / textures.
      const parallaxEls = Array.from(
        document.querySelectorAll<HTMLElement>('[data-parallax-speed]'),
      );
      parallaxEls.forEach((el) => {
        const dist = parseFloat(el.dataset.parallaxSpeed || '40');
        gsap.fromTo(
          el,
          { y: -dist },
          {
            y: dist,
            ease: 'none',
            scrollTrigger: {
              trigger: document.documentElement,
              start: 'top top',
              end: 'bottom bottom',
              scrub: 1,
            },
          },
        );
      });

      // Hero letter tiles drift as the hero section scrolls away.
      const tiles = Array.from(
        document.querySelectorAll<HTMLElement>('[data-hero-tile]'),
      );
      const heroSection = tiles[0]?.closest('section');
      if (tiles.length && heroSection) {
        gsap.to(tiles, {
          y: (i: number) => -18 - i * 3,
          rotation: (i: number) => (i % 2 ? 5 : -5),
          ease: 'none',
          scrollTrigger: {
            trigger: heroSection,
            start: 'top top',
            end: 'bottom top',
            scrub: 1,
          },
        });
      }
    });

    mm.add(
      '(pointer: fine) and (prefers-reduced-motion: no-preference)',
      () => {
        const magnets = Array.from(
          document.querySelectorAll<HTMLElement>('[data-magnetic]'),
        );
        const cleanups: Array<() => void> = [];

        magnets.forEach((el) => {
          const xTo = gsap.quickTo(el, 'x', { duration: 0.4, ease: 'power3' });
          const yTo = gsap.quickTo(el, 'y', { duration: 0.4, ease: 'power3' });

          const move = (e: MouseEvent) => {
            const { x, y } = magneticOffset(
              e.clientX,
              e.clientY,
              el.getBoundingClientRect(),
              0.35,
            );
            xTo(x);
            yTo(y);
          };
          const leave = () => {
            xTo(0);
            yTo(0);
          };

          el.addEventListener('mousemove', move);
          el.addEventListener('mouseleave', leave);
          cleanups.push(() => {
            el.removeEventListener('mousemove', move);
            el.removeEventListener('mouseleave', leave);
          });
        });

        return () => cleanups.forEach((fn) => fn());
      },
    );

    return () => mm.revert();
  });

  return null;
}
