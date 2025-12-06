import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import './SlotMachine.css';
import type { Language } from '@/shared/types';

// Character sets for different languages
const CHAR_SETS: Record<Language, string> = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  he: 'אבגדהוזחטיכלמנסעפצקרשת',
  sv: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ',
  ja: '日本人年月火水木金土一二三四五六七八九十大小中上下',
  es: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÑ',
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

const SlotMachineCell: React.FC<SlotMachineCellProps> = ({
  letter,
  delay = 0,
  duration = 800,
  language = 'en',
  isHighlighted = false,
  size = 'normal'
}) => {
  const [displayLetter, setDisplayLetter] = useState<string>(letter);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('idle');
  const previousLetterRef = useRef<string>(letter);
  const animationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const spinIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isInitialMountRef = useRef<boolean>(true);

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

      // Start animation after delay
      animationTimeoutRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;

        setIsAnimating(true);
        setAnimationPhase('spinning');

        // Spin through random letters - optimized for performance
        let spinCount = 0;
        const spinInterval = 100; // ms between letter changes (increased from 60 for better performance)
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
                setIsAnimating(false);
                setAnimationPhase('idle');
              }, 250);
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
  }, [letter, delay, duration, getRandomLetter]);

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
};

export default SlotMachineCell;
