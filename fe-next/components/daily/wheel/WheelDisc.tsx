'use client';

import React, { type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import WheelDiscLetter from './WheelDiscLetter';
import WheelTrail from './WheelTrail';
import { DiscFx } from './WheelWordFx';
import type { WheelWordFxEvent } from './useWheelWordFx';

type Press = (letter: string, index: number, el: HTMLButtonElement) => void;

interface WheelDiscProps {
  orbitRef: RefObject<HTMLDivElement | null>;
  centerLetter: string;
  outerLetters: string[];
  builtIndices: number[];
  pointerPosRef: MutableRefObject<{ x: number; y: number } | null>;
  draggingRef: MutableRefObject<boolean>;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onPress: Press;
  onHoldStart: Press;
  onHoldEnd: () => void;
  holdActiveIndex: number | null;
  tileSkin?: string | null;
  fx: WheelWordFxEvent | null;
  t: (key: string, params?: Record<string, string | number>) => string;
  reducedMotion: boolean;
  children?: ReactNode;
}

/** The playing disc: an inked plate with a groove track, the trail, the seven letters and their reactions. */
const WheelDisc: React.FC<WheelDiscProps> = ({
  orbitRef, centerLetter, outerLetters, builtIndices, pointerPosRef, draggingRef,
  onPointerDown, onPointerMove, onPointerUp, onPress, onHoldStart, onHoldEnd, holdActiveIndex,
  tileSkin, fx, t, reducedMotion, children,
}) => {
  const used = new Set(builtIndices);
  const ready = builtIndices.length >= 3;
  const kick = fx && !reducedMotion
    ? fx.kind === 'good'
      ? { scale: [1, 1.04, 0.99, 1] }
      : { x: [0, -8, 8, -6, 6, -3, 0] }
    : { scale: 1, x: 0 };

  return (
    <div
      ref={orbitRef}
      data-testid="wheel-orbit"
      // Each cap is wrapped in min(100cqb, …): the box is shrink-0 in the flex-1 cluster, so these caps alone keep it inside (see wordWheelOrbitClamp.contract).
      className="relative aspect-square [container-type:size] w-[21rem] h-[21rem] sm:w-[24rem] sm:h-[24rem] lg:w-[31rem] lg:h-[31rem] max-w-[min(100cqb,100cqi,max(176px,calc(100cqb-176px)))] max-h-[min(100cqb,100cqi,max(176px,calc(100cqb-176px)))] short:max-w-[min(100cqb,100cqi,max(132px,min(calc(100cqb-124px),46svh)))] short:max-h-[min(100cqb,100cqi,max(132px,min(calc(100cqb-124px),46svh)))] shrink-0 touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div
        data-testid="wheel-backdrop"
        aria-hidden
        className="absolute -inset-[9%] rounded-full pointer-events-none"
        style={{
          zIndex: -10,
          background:
            'radial-gradient(circle at 50% 45%, rgba(191,255,0,0.22) 0%, rgba(0,255,255,0.13) 38%, transparent 64%),' +
            'radial-gradient(circle at center, var(--neo-navy-elevated) 0%, var(--neo-navy) 60%, transparent 80%)',
        }}
      />
      <m.div
        key={fx ? fx.id : 'face'}
        data-testid="wheel-face"
        data-ready={ready ? 'true' : 'false'}
        aria-hidden
        className={cn(
          'absolute inset-[1.5%] rounded-full border-[3px] pointer-events-none transition-[border-color,box-shadow] duration-200',
          fx?.kind === 'bad' ? 'border-neo-red' : ready ? 'border-neo-lime' : 'border-neo-black',
        )}
        style={{
          background: 'radial-gradient(circle at 50% 34%, #2c3366 0%, #1d2346 46%, #121733 100%)',
          boxShadow: ready
            ? 'inset 0 4px 0 rgba(255,255,255,0.08), inset 0 -10px 0 rgba(0,0,0,0.35), 7px 8px 0 #000, 0 0 46px rgba(191,255,0,0.32)'
            : 'inset 0 4px 0 rgba(255,255,255,0.08), inset 0 -10px 0 rgba(0,0,0,0.35), 7px 8px 0 #000',
        }}
        initial={{ scale: 1, x: 0 }}
        animate={kick}
        transition={{ duration: fx?.kind === 'bad' ? 0.42 : 0.36, ease: 'easeOut' }}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full">
          <circle cx={50} cy={50} r={36.6} fill="none" stroke="rgba(0,0,0,0.32)" strokeWidth={12} />
          <circle cx={50} cy={50} r={36.6} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={0.6} />
          <circle cx={50} cy={50} r={17} fill="rgba(0,0,0,0.18)" stroke="rgba(0,255,255,0.12)" strokeWidth={0.5} />
        </svg>
        <div className="absolute inset-[3%] motion-safe:animate-[spin_48s_linear_infinite]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx={50} cy={50} r={48.5} fill="none" stroke="rgba(191,255,0,0.45)" strokeWidth={0.9} strokeDasharray="0.1 3.2" strokeLinecap="round" />
          </svg>
        </div>
      </m.div>
      <WheelTrail
        indices={builtIndices}
        outerCount={outerLetters.length}
        discRef={orbitRef}
        pointerPosRef={pointerPosRef}
        draggingRef={draggingRef}
        fx={fx}
        reducedMotion={reducedMotion}
      />
      <WheelDiscLetter
        letter={centerLetter}
        index={-1}
        isUsed={used.has(-1)}
        onPress={onPress}
        onHoldStart={onHoldStart}
        onHoldEnd={onHoldEnd}
        showHoldRing={holdActiveIndex === -1}
        tileSkin={tileSkin}
        reducedMotion={reducedMotion}
      />
      {outerLetters.map((letter, i) => (
        <WheelDiscLetter
          key={`${letter}-${i}`}
          letter={letter}
          index={i}
          outerCount={outerLetters.length}
          isUsed={used.has(i)}
          onPress={onPress}
          onHoldStart={onHoldStart}
          onHoldEnd={onHoldEnd}
          showHoldRing={holdActiveIndex === i}
          tileSkin={tileSkin}
          reducedMotion={reducedMotion}
        />
      ))}
      <DiscFx fx={fx} outerCount={outerLetters.length} t={t} reducedMotion={reducedMotion} />
      {children}
    </div>
  );
};

export default WheelDisc;
