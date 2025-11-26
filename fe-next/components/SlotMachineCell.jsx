import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [isAnimating, setIsAnimating] = useState(false);
  const [displayLetter, setDisplayLetter] = useState(letter);
  const [previousLetter, setPreviousLetter] = useState(null);
  const animationRef = useRef(null);
  const letterRef = useRef(letter);

  // Get character set for current language
  const charSet = useMemo(() => {
    return CHAR_SETS[language] || CHAR_SETS.en;
  }, [language]);

  // Generate random letters for the spinning effect
  const getRandomLetter = () => {
    return charSet[Math.floor(Math.random() * charSet.length)];
  };

  useEffect(() => {
    // Only animate if the letter actually changed
    if (letter !== letterRef.current) {
      setPreviousLetter(letterRef.current);
      letterRef.current = letter;

      // Start animation after delay
      const startTimeout = setTimeout(() => {
        setIsAnimating(true);

        // Spin through random letters
        let spinCount = 0;
        const maxSpins = Math.floor(duration / 50); // ~50ms per spin frame

        const spin = () => {
          if (spinCount < maxSpins - 3) {
            setDisplayLetter(getRandomLetter());
            spinCount++;
            animationRef.current = setTimeout(spin, 50);
          } else if (spinCount < maxSpins) {
            // Slow down at the end
            setDisplayLetter(getRandomLetter());
            spinCount++;
            animationRef.current = setTimeout(spin, 80 + (spinCount - maxSpins + 3) * 30);
          } else {
            // Final letter
            setDisplayLetter(letter);
            setIsAnimating(false);
          }
        };

        spin();
      }, delay);

      return () => {
        clearTimeout(startTimeout);
        if (animationRef.current) {
          clearTimeout(animationRef.current);
        }
      };
    }
  }, [letter, delay, duration, charSet]);

  // Initial render - set display letter without animation
  useEffect(() => {
    if (!previousLetter) {
      setDisplayLetter(letter);
    }
  }, []);

  const sizeClasses = {
    small: 'text-lg sm:text-xl',
    normal: 'text-2xl sm:text-3xl md:text-4xl',
    large: 'text-3xl sm:text-4xl md:text-5xl'
  };

  return (
    <div
      className={`
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
        transition-colors duration-200
      `}
      style={{ borderRadius: '8px' }}
    >
      {/* Slot machine reel effect */}
      <AnimatePresence mode="popLayout">
        <motion.span
          key={`${displayLetter}-${isAnimating}`}
          initial={isAnimating ? { y: -40, opacity: 0, scale: 0.8 } : false}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            rotateX: 0
          }}
          exit={{ y: 40, opacity: 0, scale: 0.8 }}
          transition={{
            duration: isAnimating ? 0.05 : 0.2,
            ease: isAnimating ? 'linear' : 'easeOut'
          }}
          className={`
            ${isAnimating ? 'blur-[0.5px]' : ''}
            ${isAnimating ? 'text-cyan-400' : ''}
          `}
          style={{
            textShadow: isAnimating
              ? '0 0 10px rgba(6, 182, 212, 0.8), 0 2px 4px rgba(0,0,0,0.3)'
              : isHighlighted
                ? '0 0 15px rgba(255,255,255,0.6)'
                : '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {displayLetter}
        </motion.span>
      </AnimatePresence>

      {/* Spinning glow effect */}
      {isAnimating && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0] }}
          transition={{ duration: 0.1, repeat: Infinity }}
          style={{
            background: 'linear-gradient(180deg, rgba(6,182,212,0.3) 0%, transparent 30%, transparent 70%, rgba(6,182,212,0.3) 100%)',
            borderRadius: '8px'
          }}
        />
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
