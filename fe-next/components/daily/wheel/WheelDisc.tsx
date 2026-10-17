'use client';

import React, { useEffect, useState, type MutableRefObject, type ReactNode, type RefObject } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import WheelDiscLetter from './WheelDiscLetter';
import WheelTrail from './WheelTrail';
import { DiscFx, LetterBursts } from './WheelWordFx';
import type { WheelReleaseEvent, WheelWordFxEvent } from './useWheelWordFx';
import { DISC, letterPoint } from '@/lib/wordWheel/discGeometry';
import '@/styles/word-wheel-motion.css';

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
  release?: WheelReleaseEvent | null;
  /** The word is out for a verdict. */
  checking?: boolean;
  reducedMotion: boolean;
  /** The letter a finger is resting on before it joins the word (null once lifted or used). */
  onPressedChange?: (letter: string | null) => void;
  /** Desktop game shell: the disc scales with the stage. */
  large?: boolean;
  children?: ReactNode;
}

/** The playing disc: an inked plate with a groove track, the trail, the seven letters and their reactions. */
const WheelDisc: React.FC<WheelDiscProps> = ({
  orbitRef, centerLetter, outerLetters, builtIndices, pointerPosRef, draggingRef,
  onPointerDown, onPointerMove, onPointerUp, onPress, onHoldStart, onHoldEnd, holdActiveIndex,
  tileSkin, fx, release = null, checking = false, reducedMotion, onPressedChange, large = false, children,
}) => {
  const [settledFx, setSettledFx] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  // An accepted word lights its letters where they sit; the wheel itself never moves.
  const celebrating = fx?.kind === 'good' && fx.id !== settledFx ? fx : null;
  const cheerOrder = (index: number) => {
    const order = celebrating ? celebrating.indices.indexOf(index) : -1;
    return order === -1 ? null : order;
  };
  const used = new Set(builtIndices);
  const livePress = pressed !== null && !used.has(pressed) ? pressed : null;
  const pressedLetter = livePress === null ? null : livePress === -1 ? centerLetter : outerLetters[livePress] ?? null;
  useEffect(() => { onPressedChange?.(pressedLetter); }, [pressedLetter, onPressedChange]);
  const holdStart: Press = (letter, index, el) => {
    if (!used.has(index)) setPressed(index);
    onHoldStart(letter, index, el);
  };
  const lift = () => {
    setPressed(null);
    onPointerUp();
  };
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
      // FDT + Growth Radar: rapid letter taps on the wheel are gameplay, not rage.
      data-feedback-ignore-rage=""
      data-gr-no-rage=""
      data-release={release ? 'true' : 'false'}
      data-size={large ? 'large' : 'default'}
      // Each cap is wrapped in min(100cqb, …): the box is shrink-0 in the flex-1 cluster, so these caps alone keep it inside (see wordWheelOrbitClamp.contract).
      className={cn(
        large ? 'w-[min(100cqi,calc(100cqb-184px),640px)] h-[min(100cqi,calc(100cqb-184px),640px)] !max-w-none !max-h-none' : 'w-[21rem] h-[21rem] sm:w-[24rem] sm:h-[24rem] lg:w-[31rem] lg:h-[31rem]',
        'ww-orbit relative aspect-square [container-type:size] max-w-[min(100cqb,100cqi,max(176px,calc(100cqb-176px)))] max-h-[min(100cqb,100cqi,max(176px,calc(100cqb-176px)))] short:max-w-[min(100cqb,100cqi,max(132px,min(calc(100cqb-124px),46svh)))] short:max-h-[min(100cqb,100cqi,max(132px,min(calc(100cqb-124px),46svh)))] shrink-0 touch-none select-none',
      )}
      onPointerDown={(e) => {
        if (celebrating) setSettledFx(celebrating.id);
        onPointerDown(e);
      }}
      onPointerMove={onPointerMove}
      onPointerUp={lift}
      onPointerCancel={lift}
      onPointerLeave={lift}
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
          fx?.kind === 'bad' ? 'border-neo-red' : release ? 'border-neo-cyan' : ready ? 'border-neo-lime' : 'border-neo-black',
        )}
        style={{
          background: 'radial-gradient(circle at 50% 34%, #2c3366 0%, #1d2346 46%, #121733 100%)',
          boxShadow: ready
            ? `inset 0 4px 0 rgba(255,255,255,0.08), inset 0 -10px 0 rgba(0,0,0,0.35), 7px 8px 0 #000, 0 0 0 6px ${release ? 'rgba(0,255,255,0.3)' : 'rgba(191,255,0,0.22)'}`
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
        <div className="absolute inset-[3%]">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx={50} cy={50} r={48.5} fill="none" stroke="rgba(191,255,0,0.45)" strokeWidth={0.9} strokeDasharray="0.1 3.2" strokeLinecap="round" />
          </svg>
        </div>
      </m.div>
      <div data-testid="wheel-letters" className="absolute inset-0" style={{ zIndex: 2 }}>
        <WheelTrail
          indices={builtIndices}
          outerCount={outerLetters.length}
          discRef={orbitRef}
          pointerPosRef={pointerPosRef}
          draggingRef={draggingRef}
          fx={fx}
          checking={checking}
          reducedMotion={reducedMotion}
        />
        <WheelDiscLetter
          letter={centerLetter}
          index={-1}
          isUsed={used.has(-1)}
          isPressed={livePress === -1}
          onPress={onPress}
          onHoldStart={holdStart}
          onHoldEnd={onHoldEnd}
          showHoldRing={holdActiveIndex === -1}
          cheerOrder={cheerOrder(-1)}
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
            isPressed={livePress === i}
            onPress={onPress}
            onHoldStart={holdStart}
            onHoldEnd={onHoldEnd}
            showHoldRing={holdActiveIndex === i}
            cheerOrder={cheerOrder(i)}
            tileSkin={tileSkin}
            reducedMotion={reducedMotion}
          />
        ))}
        <LetterBursts fx={fx} outerCount={outerLetters.length} />
        {release && (
          <div key={release.id} data-testid="wheel-release" data-word={release.letters.join('').toUpperCase()} aria-hidden className="absolute inset-0 pointer-events-none" style={{ zIndex: 4 }}>
            {release.indices.map((idx, order) => {
              const p = letterPoint(idx, outerLetters.length);
              const size = idx === -1 ? DISC.center : DISC.outer;
              return (
                <span
                  key={idx}
                  className="ww-release-ring absolute rounded-full border-[1.3cqw] border-neo-cyan"
                  style={{ width: `${size}%`, height: `${size}%`, left: `${p.x - size / 2}%`, top: `${p.y - size / 2}%`, animationDelay: `${order * 70}ms` }}
                />
              );
            })}
          </div>
        )}
      </div>
      <DiscFx fx={fx} reducedMotion={reducedMotion} />
      {children}
    </div>
  );
};

export default WheelDisc;
