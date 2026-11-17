'use client';

import { useEffect, type ReactNode } from 'react';
import { m, useAnimationControls } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { useLanguage } from '@/contexts/LanguageContext';
import { PYRAMID_ART, type PyramidSize } from './pyramidArt';
import PyramidTier, { tierStateOf } from './PyramidTier';
import PyramidCapstone from './PyramidCapstone';
import { usePyramidLanding } from './usePyramidLanding';

interface PyramidProgressProps {
  stage: number;
  solvedBridges: string[];
  gaveUpBase: [boolean, boolean, boolean];
  metaAnswer: string;
  won: boolean;
  /** A live win: the capstone drops onto the top. A restored result shows it already in place. */
  celebrate?: boolean;
  size?: PyramidSize;
  /** Pinned to the sky's top-end corner (the play screen's tries left). */
  corner?: ReactNode;
}

const SCENE_PAD: Record<PyramidSize, string> = {
  play: 'pt-1.5 [@container(max-height:42rem)]:pt-1',
  trophy: 'pt-6',
};

const EXPLORER_SIZE: Record<PyramidSize, string> = {
  play: 'h-8 [@container(max-height:42rem)]:h-7',
  trophy: 'h-11',
};

// Room at each side of the structure, so the explorer stands beside it, never on a word.
const STRUCTURE_INSET: Record<PyramidSize, string> = {
  play: 'mx-9',
  trophy: 'mx-12',
};

// Space between the capstone and the base row, where the pyramid's faces show.
const BODY_RISE: Record<PyramidSize, string> = {
  play: 'mt-6 [@container(max-height:42rem)]:mt-2',
  trophy: 'mt-8',
};

// The pyramid's two faces behind the base row and the capstone, in token-mixed
// sand: a lit face and a shaded face.
const FACE_LIT = 'color-mix(in srgb, var(--neo-yellow) 70%, var(--neo-cream))';
const FACE_SHADE = 'color-mix(in srgb, var(--neo-orange) 55%, var(--neo-yellow))';

const SHAKE = { x: [0, -4, 4, -2, 0], transition: { type: 'tween' as const, duration: 0.35 } };

/**
 * The pyramid IS the scoreboard: each solved riddle lays one base brick carved
 * with its bridge word, in stage order, and the finale sets the golden capstone
 * on top. Always fully drawn, so the goal is visible from the first riddle.
 */
export default function PyramidProgress({
  stage,
  solvedBridges,
  gaveUpBase,
  metaAnswer,
  won,
  celebrate = false,
  size = 'play',
  corner,
}: PyramidProgressProps) {
  const { t } = useLanguage();
  const prefersReducedMotion = useReducedMotion();
  const motion = !prefersReducedMotion;
  const laid = solvedBridges.filter(Boolean).length;
  const landing = usePyramidLanding(laid, motion);
  const drop = won && celebrate && motion;
  const shake = useAnimationControls();

  useEffect(() => {
    if (landing !== null) void shake.start({ ...SHAKE, transition: { ...SHAKE.transition, delay: 0.1 } });
  }, [landing, shake]);
  useEffect(() => {
    if (drop) void shake.start({ ...SHAKE, transition: { ...SHAKE.transition, delay: 0.6 } });
  }, [drop, shake]);

  // The explorer cheers; on a lost pyramid's end screen that reads as mockery.
  const showExplorer = size === 'play' || won;
  const complete = laid === 3;

  return (
    <m.div
      data-testid="pyramid-scene"
      role="group"
      aria-label={t('connections.pyramid.sceneLabel', { count: laid })}
      className={`relative isolate flex w-full flex-col items-center overflow-hidden rounded-neo border-neo-thick border-neo-black bg-neo-navy shadow-hard ${SCENE_PAD[size]}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={PYRAMID_ART.backdrop}
        alt=""
        width={1600}
        height={679}
        draggable={false}
        className="pointer-events-none absolute inset-0 -z-20 h-full w-full select-none object-cover object-bottom"
      />
      {corner && <div className="absolute end-1.5 top-1.5 z-10">{corner}</div>}
      <m.div animate={shake} className={`relative flex w-[calc(100%-4.5rem)] max-w-[24rem] flex-col items-center ${STRUCTURE_INSET[size]}`}>
        <svg
          data-testid="pyramid-body"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          className="pointer-events-none absolute -start-7 top-0 -z-10 h-full w-[calc(100%+3.5rem)] overflow-visible"
        >
          {complete ? (
            <>
              <polygon points="0,100 50,0 50,100" style={{ fill: FACE_LIT }} />
              <polygon points="50,100 50,0 100,100" style={{ fill: FACE_SHADE }} />
              <polygon points="0,100 50,0 100,100" fill="none" className="stroke-neo-black" strokeWidth="3" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
            </>
          ) : (
            <polygon
              points="0,100 50,0 100,100"
              className="fill-neo-navy/45 stroke-neo-cream/60"
              strokeWidth="2"
              strokeDasharray="6 5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          )}
        </svg>
        <PyramidCapstone metaAnswer={metaAnswer} won={won} finaleActive={size === 'play' && stage === 3 && !won} drop={drop} motion={motion} size={size} />
        <div className={`flex w-full flex-row gap-[3px] rounded-md bg-neo-black p-[3px] shadow-[4px_4px_0_rgb(var(--neo-black))] ${BODY_RISE[size]}`}>
          {([0, 1, 2] as const).map((idx) => {
            const state = tierStateOf(idx, stage, solvedBridges, gaveUpBase);
            return <PyramidTier key={`${idx}-${state}`} index={idx} state={state} word={solvedBridges[idx]} size={size} landing={landing === idx} />;
          })}
        </div>
      </m.div>
      <div data-testid="pyramid-ground" className="relative h-2.5 w-full border-t-[3px] border-neo-black" style={{ background: FACE_LIT }} />
      {showExplorer && (
        <m.span
          key={laid}
          data-testid="pyramid-explorer"
          aria-hidden="true"
          initial={landing !== null ? { y: -12 } : false}
          animate={{ y: 0 }}
          transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 }}
          className="pointer-events-none absolute bottom-2.5 start-1 z-10"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={PYRAMID_ART.explorer} alt="" width={360} height={410} draggable={false} className={`w-auto max-w-none select-none ${EXPLORER_SIZE[size]}`} />
        </m.span>
      )}
    </m.div>
  );
}
