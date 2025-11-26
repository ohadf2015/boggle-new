import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import 'animate.css';
import './SlotMachine.css';

// Character sets for different languages
const CHAR_SETS = {
  en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  he: 'אבגדהוזחטיכלמנסעפצקרשת',
  sv: 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ',
  ja: '日本人年月火水木金土一二三四五六七八九十大小中上下'
};

const SlotMachineCell = ({
  letter,
  delay = 0,
  duration = 800,
  language = 'en',
  isHighlighted = false,
  size = 'normal'
}) => {
  const [displayLetter, setDisplayLetter] = useState(letter);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationPhase, setAnimationPhase] = useState('idle'); // 'idle', 'spinning', 'landing'
  const previousLetterRef = useRef(letter);
  const animationTimeoutRef = useRef(null);
  const spinIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const isInitialMountRef = useRef(true);

  // Get character set for current language
  const charSet = useMemo(() => {
    return CHAR_SETS[language] || CHAR_SETS.en;
  }, [language]);

  // Generate random letter for spinning effect
  const getRandomLetter = useCallback(() => {
    return charSet[Math.floor(Math.random() * charSet.length)];
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
            clearInterval(spinIntervalRef.current);
            return;
          }

          spinCount++;
          setDisplayLetter(getRandomLetter());

          if (spinCount >= totalSpins) {
            clearInterval(spinIntervalRef.current);
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

  const sizeClasses = {
    small: 'text-lg sm:text-xl',
    normal: 'text-2xl sm:text-3xl md:text-4xl',
    large: 'text-3xl sm:text-4xl md:text-5xl'
  };

  // Get CSS classes based on animation phase
  const getLetterClasses = () => {
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
        font-bold overflow-hidden rounded-lg
        ${sizeClasses[size]}
        ${isHighlighted
          ? 'bg-yellow-500 text-white'
          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
        }
        border-2
        ${isHighlighted ? 'border-yellow-300' : 'border-slate-300/60 dark:border-slate-600/60'}
      `}
    >
      {/* Slot machine letter display */}
      <span className={getLetterClasses()}>
        {displayLetter}
      </span>
    </div>
  );
};

export default SlotMachineCell;
