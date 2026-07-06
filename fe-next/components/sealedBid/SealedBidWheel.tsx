'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { WheelLetter } from '@/components/daily/WordWheelParts';
import WordWheelPixiRing from '@/components/daily/WordWheelPixiRing';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { cn } from '@/lib/utils';

export interface SealedBidWheelProps {
  letters: string[];
  disabled?: boolean;
  onChange: (word: string, indices: number[]) => void;
  onSubmit: (word: string, indices: number[]) => void;
  reducedMotion?: boolean;
  dir?: 'ltr' | 'rtl';
}

const CIRCLE_RADIUS = 140; // px from center to outer tiles

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
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  // Build the word from picked indices
  const word = picks.map((i) => letters[i]).join('');

  // Wire drag-to-spell
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (idx) => picks.includes(idx),
    addLetter: (idx) => {
      setPicks((p) => [...p, idx]);
    },
    getBuiltLength: () => picks.length,
    submit: () => {
      onSubmit(word, picks);
    },
  });

  // Call onChange whenever picks change
  useEffect(() => {
    const newWord = picks.map((i) => letters[i]).join('');
    onChange(newWord, picks);
  }, [picks, letters, onChange]);

  // Handle tap on a tile
  const handleTilePress = (letter: string, idx: number, el: HTMLButtonElement) => {
    if (disabled || picks.includes(idx)) return;
    setPicks((p) => [...p, idx]);
  };

  // Clear all picks
  const handleClear = () => {
    setPicks([]);
  };

  // Angle for each outer tile: i * (360/7)
  const getAngle = (i: number) => (i * 360) / 7;

  return (
    <div
      className="flex flex-col items-center justify-center gap-6"
      dir={dir}
    >
      {/* Wheel container with drag handlers */}
      <div
        ref={wheelContainerRef}
        className="relative w-full max-w-sm aspect-square"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        {/* Pixi ring background */}
        <WordWheelPixiRing
          selectedIndices={picks}
          radius={CIRCLE_RADIUS}
          combo={0}
          pointerPosRef={pointerPosRef}
          isDraggingRef={draggingRef}
        />

        {/* Tiles arranged in circle */}
        <div className="absolute inset-0">
          {letters.map((letter, idx) => (
            <WheelLetter
              key={idx}
              letter={letter}
              isCenter={false}
              angle={getAngle(idx)}
              radius={CIRCLE_RADIUS}
              onPress={handleTilePress}
              isUsed={picks.includes(idx)}
              index={idx}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      </div>

      {/* Clear button */}
      <button
        onClick={handleClear}
        disabled={disabled || picks.length === 0}
        className={cn(
          'px-4 py-2 border-neo-thick border-neo-black rounded-neo font-neo-display text-sm uppercase transition-colors duration-150',
          'bg-neo-white text-neo-black shadow-hard hover:bg-neo-cream',
          'disabled:bg-neo-navy-light disabled:text-neo-white/40 disabled:shadow-none disabled:cursor-not-allowed',
        )}
        aria-label={t('wordWheel.clear') || 'Clear'}
      >
        {t('wordWheel.clear') || 'Clear'}
      </button>
    </div>
  );
}
