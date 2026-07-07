'use client';

import React, { useState, useRef, useEffect } from 'react';
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
}

export default function SealedBidWheel({
  letters,
  disabled = false,
  onChange,
  onSubmit,
  reducedMotion = false,
  dir = 'ltr',
}: SealedBidWheelProps) {
  const { t } = useLanguage();
  const [picks, setPicks] = useState<number[]>([]);

  const draggingRef = useRef(false);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute built word from picks
  const word = picks.map(i => letters[i]).join('');

  // Wire useWheelDragSpell
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (i) => picks.includes(i),
    addLetter: (i) => {
      if (!picks.includes(i)) {
        setPicks(p => [...p, i]);
      }
    },
    getBuiltLength: () => picks.length,
    submit: () => {
      onSubmit(word, picks);
    },
  });

  // Call onChange whenever picks change
  useEffect(() => {
    onChange(word, picks);
  }, [picks, word, onChange]);

  // Handle tap on tile
  const handleTilePress = (letter: string, index: number) => {
    if (picks.includes(index)) {
      // Remove the letter
      setPicks(p => p.filter(i => i !== index));
    } else {
      // Add the letter
      setPicks(p => [...p, index]);
    }
  };

  // Clear button
  const handleClear = () => {
    setPicks([]);
  };

  // Wheel layout: 7 letters in a circle
  const RADIUS = 140;
  const TILES_COUNT = 7;

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative w-full h-96 flex flex-col items-center justify-center select-none',
        dir === 'rtl' && 'rtl'
      )}
      dir={dir}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* WordWheelPixiRing behind the tiles */}
      <div className="absolute inset-0 pointer-events-none">
        {!reducedMotion && (
          <WordWheelPixiRing
            selectedIndices={picks}
            radius={RADIUS}
            combo={0}
            pointerPosRef={pointerPosRef}
            isDraggingRef={draggingRef}
          />
        )}
      </div>

      {/* Wheel letter tiles */}
      <div className="relative w-96 h-96">
        {letters.map((letter, index) => {
          const angle = (index / TILES_COUNT) * 360;
          return (
            <WheelLetter
              key={index}
              letter={letter}
              isCenter={false}
              angle={angle}
              radius={RADIUS}
              index={index}
              isUsed={picks.includes(index)}
              onPress={handleTilePress}
              reducedMotion={reducedMotion}
            />
          );
        })}
      </div>

      {/* Clear button */}
      {picks.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled}
          className={cn(
            'mt-6 px-6 py-2 rounded-neo border-neo-thick border-neo-black font-neo-display font-bold',
            'bg-neo-red text-neo-white shadow-hard',
            'hover:bg-neo-red/90 active:shadow-hard-pressed',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-label={t('sealedBid.clear') || 'Clear'}
        >
          {t('sealedBid.clear') || 'Clear'}
        </button>
      )}
    </div>
  );
}
