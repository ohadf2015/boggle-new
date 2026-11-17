'use client';

import type { CSSProperties } from 'react';
import { m } from 'framer-motion';
import { PYRAMID_ART, type PyramidSize } from './pyramidArt';
import { carvedWordSize } from './pyramidFit';

const APEX_SIZE: Record<PyramidSize, string> = {
  play: 'h-[3.25rem] [@container(max-height:42rem)]:h-11',
  trophy: 'h-20',
};

const RAY_COUNT = 16;
const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => {
  const a = (i / RAY_COUNT) * Math.PI * 2;
  const w = Math.PI / RAY_COUNT / 2;
  const p = (r: number, ang: number) => `${(50 + r * Math.cos(ang)).toFixed(2)},${(50 + r * Math.sin(ang)).toFixed(2)}`;
  return `50,50 ${p(50, a - w)} ${p(50, a + w)}`;
});

interface PyramidCapstoneProps {
  metaAnswer: string;
  won: boolean;
  finaleActive: boolean;
  /** Play the drop onto the top (a live win); otherwise the capstone simply sits there. */
  drop: boolean;
  /** Motion allowed (false under reduced motion). */
  motion: boolean;
  size: PyramidSize;
}

export default function PyramidCapstone({ metaAnswer, won, finaleActive, drop, motion, size }: PyramidCapstoneProps) {
  return (
    <div
      data-testid="pyramid-apex"
      data-state={won ? 'won' : finaleActive ? 'finale' : 'locked'}
      data-drop={drop ? 'true' : 'false'}
      className={`relative flex aspect-[360/314] items-end justify-center [container-type:size] ${APEX_SIZE[size]}`}
    >
      {won ? (
        <>
          <m.svg
            viewBox="0 0 100 100"
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[260%] w-auto -translate-x-1/2 -translate-y-1/2"
            initial={drop ? { scale: 0 } : false}
            animate={motion ? { scale: 1, rotate: 360 } : { scale: 1 }}
            transition={{
              scale: { type: 'spring', stiffness: 200, damping: 14, delay: drop ? 0.75 : 0 },
              rotate: { duration: 24, ease: 'linear', repeat: Infinity },
            }}
          >
            {RAYS.map((points) => (
              <polygon key={points} points={points} className="fill-neo-yellow/45" />
            ))}
          </m.svg>
          <m.div
            className="relative h-full"
            initial={drop ? { y: -90, rotate: -14 } : false}
            animate={{ y: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 13, delay: drop ? 0.35 : 0 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PYRAMID_ART.capstone}
              alt=""
              width={360}
              height={314}
              draggable={false}
              className="h-full w-auto select-none"
            />
            <span
              data-word
              dir="auto"
              style={{ '--carve': carvedWordSize(metaAnswer, 'capstone') } as CSSProperties}
              className="absolute bottom-[4%] left-1/2 -translate-x-1/2 whitespace-nowrap [font-size:var(--carve)] rounded-md border-2 border-neo-black bg-neo-yellow px-1.5 py-0.5 font-neo-display font-black uppercase leading-none text-neo-navy shadow-hard-sm"
            >
              {metaAnswer}
            </span>
          </m.div>
        </>
      ) : (
        <m.span
          className="relative flex h-full w-full items-end justify-center"
          animate={finaleActive && motion ? { scale: [1, 1.08, 1] } : { scale: 1 }}
          transition={finaleActive && motion ? { type: 'tween', duration: 1.4, ease: 'easeInOut', repeat: Infinity } : { duration: 0.2 }}
        >
          <svg viewBox="0 0 100 87" aria-hidden="true" className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
            <polygon
              points="50,3 97,84 3,84"
              strokeWidth="5"
              strokeDasharray="10 7"
              strokeLinejoin="round"
              className={finaleActive ? 'fill-neo-navy/80 stroke-neo-cyan' : 'fill-neo-navy/60 stroke-neo-purple-light'}
            />
          </svg>
          <span
            className={`relative mb-[12%] font-neo-display text-[34cqh] font-black leading-none ${
              finaleActive ? 'text-neo-cyan' : 'text-neo-purple-light'
            }`}
          >
            ?
          </span>
        </m.span>
      )}
    </div>
  );
}
