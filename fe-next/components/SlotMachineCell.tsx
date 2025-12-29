import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import './SlotMachine.css';
import type { Language } from '@/shared/types';
import { useDevicePerformance } from '../hooks/useDevicePerformance';

// Character sets for different languages
const CHAR_SETS: Record<Language, string> = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  he: 'אבגדהוזחטיכלמנסעפצקרשת',
  sv: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ',
  ja: '日本人年月火水木金土一二三四五六七八九十大小中上下',
  es: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZÁÉÍÓÚÜ',
  fr: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÀÂÆÇÉÈÊËÏÎÔÙÛÜŸ',
  de: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜß',
};

type AnimationPhase = 'idle' | 'spinning' | 'landing';
type CellSize = 'normal' | 'small' | 'large';

interface SlotMachineCellProps {
  letter: string;
  delay?: number;
  duration?: number;
  language?: Language;
  isHighlighted?: boolean;
  size?: CellSize;
}

/**
 * SlotMachineCell - Individual cell with slot machine animation
 *
 * PERFORMANCE: On low-end devices, skips spinning animation entirely
 * and shows final letter immediately with a simple CSS fade transition.
 */
const SlotMachineCell: React.FC<SlotMachineCellProps> = memo(({
  letter,
  delay = 0,
  duration = 800,
  language = 'en',
  isHighlighted = false,
  size = 'normal'
}) => {
  const [displayLetter, setDisplayLetter] = useState<string>(letter);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const previousLetterRef = useRef<string>(letter);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isInitialMountRef = useRef<boolean>(true);

  // PERFORMANCE: Get device capability for adaptive animation
  const { isLowEnd, enableComplexAnimations, prefersReducedMotion } = useDevicePerformance();
  const shouldAnimate = enableComplexAnimations && !prefersReducedMotion && !isLowEnd;

  // Get character set for current language
  const charSet = useMemo(() => {
    return CHAR_SETS[language] || CHAR_SETS.en;
  }, [language]);

  // Generate random letter for spinning effect
  const getRandomLetter = useCallback((): string => {
    return charSet[Math.floor(Math.random() * charSet.length)] ?? 'A';
  }, [charSet]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Skip animation on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      setDisplayLetter(letter);
      previousLetterRef.current = letter;
      return;
    }

    // Only animate if the letter actually changed
    if (letter !== previousLetterRef.current) {
      previousLetterRef.current = letter;

      // Clear any existing animations
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }

      // PERFORMANCE: On low-end devices, skip spinning and show letter with simple delay
      if (!shouldAnimate) {
        animationTimeoutRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setAnimationPhase('landing');
          setDisplayLetter(letter);
          // Quick reset
          setTimeout(() => {
            if (isMountedRef.current) setAnimationPhase('idle');
          }, 150);
        }, delay);
        return;
      }

      // Start animation after delay
      animationTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        setAnimationPhase('spinning');

        // Spin through random letters - reduced iterations for better performance
        let spinCount = 0;
        // PERFORMANCE: Increased interval from 100ms to 150ms = 33% fewer updates
        const spinInterval = 150;
        const totalSpins = Math.floor(duration / spinInterval);

        spinIntervalRef.current = setInterval(() => {
          if (!isMountedRef.current) {
            if (spinIntervalRef.current) {
              clearInterval(spinIntervalRef.current);
            }
            return;
          }

          spinCount++;
          setDisplayLetter(getRandomLetter());

          if (spinCount >= totalSpins) {
            if (spinIntervalRef.current) {
              clearInterval(spinIntervalRef.current);
            }
            setAnimationPhase('landing');

            // Show final letter with landing animation
            setTimeout(() => {
              if (!isMountedRef.current) return;
              setDisplayLetter(letter);

              // Reset animation state after landing animation completes
              setTimeout(() => {
                if (!isMountedRef.current) return;
                setAnimationPhase('idle');
              }, 200);
            }, 50);
          }
        }, spinInterval);
      }, delay);
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
      if (spinIntervalRef.current) {
        clearInterval(spinIntervalRef.current);
      }
    };
  }, [letter, delay, duration, getRandomLetter, shouldAnimate]);

  // Get CSS classes based on animation phase
  const getLetterClasses = (): string => {
    const classes = ['slot-letter', 'slot-letter-transition'];

    if (animationPhase === 'spinning') {
      classes.push('slot-letter-spinning');
    }
    if (animationPhase === 'landing') {
      classes.push('slot-letter-final');
    }

    return classes.join(' ');
  };

  return (
    <div
      className={`
        relative aspect-square flex items-center justify-center
        font-black overflow-hidden
        ${/* NEO-BRUTALIST: Clean white tiles with hard shadows */ ''}
        ${isHighlighted
          ? 'bg-neo-yellow text-neo-black border-3 border-neo-black shadow-hard'
          : 'bg-neo-white text-neo-black border-3 border-neo-black shadow-hard-sm'
        }
      `}
      style={{
        borderRadius: '4px',
        // Use responsive font size from parent grid
        fontSize: 'var(--cell-font-size)',
      }}
    >
      {/* Slot machine letter display */}
      <span className={getLetterClasses()}>
        {displayLetter}
      </span>
    </div>
  );
});

SlotMachineCell.displayName = 'SlotMachineCell';

export default SlotMachineCell;
