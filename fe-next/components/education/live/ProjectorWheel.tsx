'use client';

import { useEffect, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { WheelPuzzle } from '@/shared/types/game';

/**
 * The room's Wheel Rush puzzle for the projector. The server broadcasts
 * `wheelRushInit` once per round; a projector that mounts after it (or
 * reconnects) asks with `requestWheelRushState`, the same door players use.
 */
export function useProjectorWheelPuzzle(socket: Pick<Socket, 'on' | 'off' | 'emit'> | null | undefined, active: boolean): WheelPuzzle | null {
  const [puzzle, setPuzzle] = useState<WheelPuzzle | null>(null);
  useEffect(() => {
    if (!socket || !active) return;
    const onInit = (data: { puzzle?: WheelPuzzle }) => { if (data?.puzzle) setPuzzle(data.puzzle); };
    const onStart = () => {
      setPuzzle(null);
      socket.emit('requestWheelRushState');
    };
    socket.on('wheelRushInit', onInit);
    socket.on('startGame', onStart);
    socket.emit('requestWheelRushState');
    return () => {
      socket.off('wheelRushInit', onInit);
      socket.off('startGame', onStart);
    };
  }, [socket, active]);
  return active ? puzzle : null;
}

const upper = (letter: string) => letter.toUpperCase();
const TILE = 'absolute grid place-items-center rounded-full border-[3px] border-neo-black font-neo-display font-black leading-none shadow-hard-sm';

/** The class wheel, read-only, sized to its cell, for the projector during a round. */
export default function ProjectorWheel({ puzzle, label }: { puzzle: WheelPuzzle; label: string }) {
  const outer = puzzle.outerLetters;
  return (
    <div
      role="img"
      aria-label={label}
      data-testid="projector-wheel"
      dir="ltr"
      className="relative hidden aspect-square h-full max-h-full shrink-0 rounded-full border-4 border-neo-cream bg-neo-navy-light shadow-hard-lg md:block"
    >
      <span aria-hidden="true" className="absolute inset-[12%] rounded-full border-2 border-dashed border-neo-cream/25" />
      <span
        data-testid="projector-wheel-center"
        className={`${TILE} left-1/2 top-1/2 size-[30%] -translate-x-1/2 -translate-y-1/2 bg-neo-lime text-[3.4vw] text-neo-black`}
      >
        {upper(puzzle.centerLetter)}
      </span>
      {outer.map((letter, i) => {
        const angle = (2 * Math.PI * i) / outer.length;
        return (
          <span
            key={`${letter}-${i}`}
            data-testid="projector-wheel-letter"
            className={`${TILE} size-[20%] -translate-x-1/2 -translate-y-1/2 bg-neo-cream text-[2.4vw] text-neo-black`}
            style={{ left: `${50 + 36 * Math.sin(angle)}%`, top: `${50 - 36 * Math.cos(angle)}%` }}
          >
            {upper(letter)}
          </span>
        );
      })}
    </div>
  );
}
