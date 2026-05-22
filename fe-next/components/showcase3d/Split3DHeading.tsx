'use client';

import { useRef, type ElementType } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, useGSAP);
}

/**
 * Heading whose characters flip up into place in 3D on scroll-in (one-shot, not
 * scrub — so it never competes with the canvas scrub for the main thread).
 * Renders plain text server-side; SplitText splits on the client after mount and
 * reverts on cleanup to keep the DOM/hydration honest. Reduced-motion: no split.
 */
export default function Split3DHeading({
  text,
  className,
  as: Tag = 'h2',
}: {
  text: string;
  className?: string;
  as?: ElementType;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (!ref.current) return;
        // split words AND chars: chars animate, but word wrappers keep words from
        // breaking mid-word across lines (e.g. "Make it" splitting into "Make i / t").
        const split = new SplitText(ref.current, { type: 'words,chars', charsClass: 's3-char' });
        gsap.from(split.chars, {
          yPercent: 110,
          autoAlpha: 0,
          rotationX: -90,
          transformOrigin: '50% 100% -16px',
          stagger: 0.028,
          duration: 0.7,
          ease: 'back.out(1.7)',
          scrollTrigger: { trigger: ref.current, start: 'top 85%' },
        });
        return () => split.revert();
      });
    },
    { scope: ref },
  );

  return (
    <Tag ref={ref} className={className} style={{ perspective: 600 }}>
      {text}
    </Tag>
  );
}
