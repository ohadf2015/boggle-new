'use client';

import React, { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import { useLanguage } from '@/contexts/LanguageContext';
import { WheelLetter } from '@/components/daily/WordWheelParts';
import WordWheelPixiRing from '@/components/daily/WordWheelPixiRing';
import { useWheelDragSpell } from '@/hooks/useWheelDragSpell';
import { selectWheelRadius } from '@/lib/wordWheel/wheelGeometry';
import { cn } from '@/lib/utils';

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
  const wheelContainerRef = useRef<HTMLDivElement>(null);

  // Radius tracks the container's rendered size (shared with the daily +
  // multiplayer word wheels) so the 7-petal ring shrinks to fit whatever
  // space GameStage's flex layout leaves it instead of overflowing on short
  // viewports — that overflow was the root cause of page scroll here.
  const [radius, setRadius] = useState(140);
  useEffect(() => {
    const el = wheelContainerRef.current;
    if (!el) return;
    const shortVp = typeof window !== 'undefined' ? window.matchMedia('(max-height: 600px)') : null;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setRadius(selectWheelRadius({ width: rect.width, height: rect.height, isShort: !!shortVp?.matches }));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    shortVp?.addEventListener?.('change', update);
    return () => {
      ro.disconnect();
      shortVp?.removeEventListener?.('change', update);
    };
  }, []);

  // Build the word from picked indices
  const word = picks.map((i) => letters[i]).join('');
  const pickedSet = new Set(picks);

  // Wire drag-to-spell
  const { handlePointerDown, handlePointerMove, handlePointerUp } = useWheelDragSpell({
    draggingRef,
    pointerPosRef,
    minLength: 3,
    isIndexUsed: (idx) => pickedSet.has(idx),
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
    onChange(word, picks);
  }, [word, picks, onChange]);

  // Handle tap on a tile — a quick squash+pop confirms the tap registered,
  // since tiles were otherwise silent on press (felt unresponsive).
  const handleTilePress = (_letter: string, idx: number, el: HTMLButtonElement) => {
    if (disabled || pickedSet.has(idx)) return;
    setPicks((p) => [...p, idx]);
    if (!reducedMotion) {
      gsap.fromTo(el, { scale: 0.85 }, { scale: 1, duration: 0.25, ease: 'back.out(2)' });
    }
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
          radius={radius}
          combo={0}
          pointerPosRef={pointerPosRef}
          isDraggingRef={draggingRef}
          outerCount={letters.length}
        />

        {/* Tiles arranged in circle */}
        <div className="absolute inset-0">
          {letters.map((letter, idx) => (
            <WheelLetter
              key={idx}
              letter={letter}
              isCenter={false}
              angle={getAngle(idx)}
              radius={radius}
              onPress={handleTilePress}
              isUsed={pickedSet.has(idx)}
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
