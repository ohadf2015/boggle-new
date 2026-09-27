'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { WheelLetter } from '@/components/daily/WordWheelParts';
import WordWheelPixiRing from '@/components/daily/WordWheelPixiRing';

export interface SealedBidWheelProps {
  letters: string[];
  disabled?: boolean;
  onChange: (word: string, indices: number[]) => void;
  onSubmit: (word: string, indices: number[]) => void;
  reducedMotion?: boolean;
  dir?: 'ltr' | 'rtl';
  /** Fluid smaller wheel for table layout (default full). */
  compact?: boolean;
}

export default function SealedBidWheel({
  letters,
  disabled = false,
  onChange,
  onSubmit,
  reducedMotion = false,
  dir = 'ltr',
  compact = false,
}: SealedBidWheelProps) {
  const { t } = useLanguage();
  const [picks, setPicks] = useState<number[]>([]);
  const [radius, setRadius] = useState(compact ? 100 : 140);

  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wheelBoxRef = useRef<HTMLDivElement>(null);

  const word = picks.map((i) => letters[i]).join('');

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (i) => picks.includes(i),
    addLetter: (i) => {
      if (disabled) return;
      if (!picks.includes(i)) {
        setPicks((p) => [...p, i]);
      }
    },
    getBuiltLength: () => picks.length,
    submit: () => {
      if (disabled) return;
      onSubmit(word, picks);
    },
  });

  useEffect(() => {
    onChange(word, picks);
  }, [picks, word, onChange]);

  // Fluid radius from container size — avoids fixed 384px overflow on phones
  useEffect(() => {
    const el = wheelBoxRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const measure = () => {
      const size = Math.min(el.clientWidth, el.clientHeight);
      if (size === 0) return;
      // Read a real tile instead of assuming its size: the tile classes are
      // breakpoint-driven (52 / 60 / 68px), and the old `size * 0.38` orbit left
      // room for a ~40px half-tile. At md the half-tile is 34, so 0.38·280 + 34
      // = 140 = exactly the box radius — tiles sat ON the boundary and spilled
      // out of the felt onto the word display above and the stake pot below.
      const tile = el.querySelector<HTMLElement>('[data-wheel-index]');
      const tileHalf = (tile?.offsetWidth || 56) / 2;
      const cap = compact ? 120 : 140;
      // Floor of 60 keeps the 7 tiles from overlapping each other: adjacent
      // centres are 2r·sin(π/7) ≈ 0.87r apart, so r must exceed ~1.15× a tile.
      const next = Math.max(60, Math.min(cap, Math.floor(size / 2 - tileHalf - 6)));
      setRadius(next);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [compact]);

  // Reset picks when letters change (new round)
  const lettersKey = useMemo(() => letters.join(''), [letters]);
  useEffect(() => {
    setPicks([]);
  }, [lettersKey]);

  const handleTilePress = (_letter: string, index: number) => {
    if (disabled) return;
    if (picks.includes(index)) {
      setPicks((p) => p.filter((i) => i !== index));
    } else {
      setPicks((p) => [...p, index]);
    }
  };

  const handleClear = () => {
    if (disabled) return;
    setPicks([]);
  };

  // Single source of truth for the angular grid: the tiles below AND the pixi
  // ring's connector lines both step by 360/TILES_COUNT. Racks are always 7
  // (pinned by racksInvariant.test.ts), but deriving it from `letters` keeps the
  // two in lockstep — the previous hardcoded 7 here never reached the ring, which
  // defaults to the daily wheel's 6, so lines drew 60° apart over 51.43° tiles.
  const TILES_COUNT = letters.length || 7;
  // Height-driven, not width-driven. `w-…  aspect-square` sized the box off the
  // WIDTH it was offered, so inside the felt's height-constrained flex column
  // the square grew taller than the row and overflowed onto its siblings.
  // `h-full` binds it to the row the flex layout actually granted; the width
  // cap then only ever shrinks it further. (Every ancestor up to the felt well
  // is `flex-1 min-h-0`, so `h-full` resolves.)
  const wheelSizeClass = compact
    ? 'h-full max-h-[280px] w-full max-w-[min(100%,280px)] aspect-square'
    : 'h-full max-h-[360px] w-full max-w-[min(100%,360px)] aspect-square';

  return (
    <div
      ref={containerRef}
      data-testid="sealed-bid-wheel"
      className={cn(
        'relative flex w-full flex-col items-center justify-center select-none',
        // h-full/min-h-0 so the box below can bind to the granted row height
        // rather than growing this wrapper to fit an oversized square.
        compact ? 'h-full min-h-0 py-1' : 'h-auto min-h-[240px]',
        dir === 'rtl' && 'rtl',
        disabled && 'pointer-events-none opacity-60'
      )}
      dir={dir}
      onPointerDown={disabled ? undefined : handlePointerDown}
      onPointerMove={disabled ? undefined : handlePointerMove}
      onPointerUp={disabled ? undefined : handlePointerUp}
      onPointerLeave={disabled ? undefined : handlePointerUp}
    >
      <div className={cn('relative', wheelSizeClass)} ref={wheelBoxRef}>
        <div className="absolute inset-0 pointer-events-none">
          {!reducedMotion && (
            <WordWheelPixiRing
              selectedIndices={picks}
              radius={radius}
              combo={0}
              pointerPosRef={pointerPosRef}
              isDraggingRef={draggingRef}
              outerCount={TILES_COUNT}
            />
          )}
        </div>

        <div className="relative h-full w-full">
          {letters.map((letter, index) => {
            const angle = (index / TILES_COUNT) * 360;
            return (
              <WheelLetter
                key={`${lettersKey}-${index}`}
                letter={letter}
                isCenter={false}
                angle={angle}
                radius={radius}
                index={index}
                isUsed={picks.includes(index)}
                onPress={handleTilePress}
                reducedMotion={reducedMotion}
                compact={compact}
              />
            );
          })}
        </div>

        {/* Clear lives in the wheel's hub. Sealed Bid has no centre letter
            (every tile is isCenter={false}), so the hub is dead space — and in
            the flow below the wheel this button shifted the whole wheel up by
            half its height the moment you picked a letter, which is what put
            the top tile back on the word display. Absolute = zero layout cost
            and no jump between the empty and picked states. */}
        {picks.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            className={cn(
              'absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2',
              'flex min-h-11 min-w-11 items-center justify-center rounded-full border-3 border-black',
              'font-neo-display text-[11px] font-black uppercase tracking-wide',
              'bg-neo-red text-neo-white shadow-hard-sm active:shadow-hard-pressed',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            aria-label={t('sealedBid.clear')}
          >
            {t('sealedBid.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
