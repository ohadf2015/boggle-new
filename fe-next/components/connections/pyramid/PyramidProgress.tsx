'use client';

import { useEffect } from 'react';
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
}

const SCENE_PAD: Record<PyramidSize, string> = {
  play: 'pt-1.5 pb-1.5 [@container(max-height:42rem)]:pt-1 [@container(max-height:42rem)]:pb-1',
  trophy: 'pt-8 pb-3',
};

const EXPLORER_SIZE: Record<PyramidSize, string> = {
  play: 'h-7 [@container(max-height:42rem)]:h-6',
  trophy: 'h-10',
};

const SHAKE = { x: [0, -4, 4, -2, 0], transition: { type: 'tween' as const, duration: 0.35 } };

/**
 * The pyramid IS the scoreboard: each solved riddle lays a stone tier carved
 * with its bridge word, bottom first, and the finale sets the golden capstone
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

  const explorer = (onTier: string) => (
    <m.span
      key={onTier}
      data-testid="pyramid-explorer"
      data-on-tier={onTier}
      aria-hidden="true"
      initial={landing !== null ? { y: -12 } : false}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 14, delay: 0.25 }}
      className={`pointer-events-none absolute z-10 ${onTier === 'ground' ? 'bottom-0 end-full me-1' : 'bottom-full -start-0.5'}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={PYRAMID_ART.explorer} alt="" width={360} height={410} draggable={false} className={`w-auto max-w-none select-none ${EXPLORER_SIZE[size]}`} />
    </m.span>
  );

  const top = laid - 1;
  // The explorer cheers; on a lost pyramid's end screen that reads as mockery.
  const showExplorer = size === 'play' || won;
  const tiers = ([2, 1, 0] as const).map((idx) => (
    <PyramidTier
      key={`${idx}-${tierStateOf(idx, stage, solvedBridges, gaveUpBase)}`}
      index={idx}
      state={tierStateOf(idx, stage, solvedBridges, gaveUpBase)}
      word={solvedBridges[idx]}
      size={size}
      landing={landing === idx}
      explorer={!showExplorer ? undefined : idx === top ? explorer(String(idx)) : idx === 0 && top < 0 ? explorer('ground') : undefined}
    />
  ));

  return (
    <m.div
      data-testid="pyramid-scene"
      role="group"
      aria-label={t('connections.pyramid.sceneLabel', { count: laid })}
      animate={shake}
      className={`relative isolate flex w-full flex-col items-center overflow-hidden rounded-neo border-neo-thick border-neo-black bg-neo-navy px-2 shadow-hard ${SCENE_PAD[size]}`}
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
      <PyramidCapstone metaAnswer={metaAnswer} won={won} finaleActive={size === 'play' && stage === 3 && !won} drop={drop} motion={motion} size={size} />
      <div className="flex flex-col items-center">{tiers}</div>
    </m.div>
  );
}
