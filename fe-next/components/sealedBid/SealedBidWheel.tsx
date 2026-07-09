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
      // Leave room for tile extent (~36–40px half)
      const next = Math.max(72, Math.min(compact ? 120 : 140, Math.floor(size * 0.38)));
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

  const TILES_COUNT = 7;
  const wheelSizeClass = compact
    ? 'w-[min(100%,280px)] aspect-square max-h-[min(42dvh,280px)]'
    : 'w-[min(100%,360px)] aspect-square max-h-[min(50dvh,360px)]';

  return (
    <div
      ref={containerRef}
      data-testid="sealed-bid-wheel"
      className={cn(
        'relative flex w-full flex-col items-center justify-center select-none',
        compact ? 'min-h-0 py-1' : 'h-auto min-h-[240px]',
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
              />
            );
          })}
        </div>
      </div>

      {picks.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            'mt-2 min-h-9 rounded-neo border-2 border-black px-4 py-1.5 font-neo-display text-xs font-bold',
            'bg-neo-red text-neo-white shadow-hard-sm',
            'active:shadow-hard-pressed',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          aria-label={t('sealedBid.clear')}
        >
          {t('sealedBid.clear')}
        </button>
      )}
    </div>
  );
}
