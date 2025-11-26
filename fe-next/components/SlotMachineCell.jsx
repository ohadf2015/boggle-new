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

        // Spin through random letters
        let spinCount = 0;
        const spinInterval = 60; // ms between letter changes
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
        slot-reel-container
        relative aspect-square flex items-center justify-center
        font-bold overflow-hidden
        ${sizeClasses[size]}
        ${isHighlighted
          ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-[0_0_20px_rgba(251,191,36,0.6)]'
          : 'bg-gradient-to-br from-slate-100 via-white to-slate-100 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-slate-900 dark:text-white'
        }
        border-2
        ${isHighlighted ? 'border-yellow-300' : 'border-slate-300/60 dark:border-slate-600/60'}
        shadow-lg
        ${isAnimating ? 'slot-glow' : ''}
      `}
      style={{ borderRadius: '8px' }}
    >
      {/* Slot machine letter display */}
      <span
        className={getLetterClasses()}
        style={{
          textShadow: isHighlighted && !isAnimating
            ? '0 0 15px rgba(255,255,255,0.6)'
            : !isAnimating ? '0 2px 4px rgba(0,0,0,0.2)' : undefined
        }}
      >
        {displayLetter}
      </span>

      {/* Spinning reel effect overlay */}
      {isAnimating && animationPhase === 'spinning' && (
        <div className="slot-cell-spinning" />
      )}

      {/* Top and bottom gradients for 3D depth (slot machine look) */}
      <div
        className="absolute inset-x-0 top-0 h-1/4 pointer-events-none"
        style={{
          background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
          borderRadius: '8px 8px 0 0'
        }}
      />
      <div
        className="absolute inset-x-0 bottom-0 h-1/4 pointer-events-none"
        style={{
          background: 'linear-gradient(0deg, rgba(0,0,0,0.15) 0%, transparent 100%)',
          borderRadius: '0 0 8px 8px'
        }}
      />
    </div>
  );
};

export default SlotMachineCell;
