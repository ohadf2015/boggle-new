import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../contexts/LanguageContext';
import { hebrewLetters, englishLetters, swedishLetters, japaneseLetters } from '../utils/consts';
import AchievementPopup from './achievements/AchievementPopup';
import type { Achievement } from '@/types';

/**
 * MenuAnimation - Flying letters animation for the menu/join view
 * Neo-Brutalist style with bold borders, sharp shadows
 * Click on letters to pop them like balloons!
 */

interface ParticleData {
  id: number;
  angle: number;
  distance: number;
  rotation: number;
}

interface PopParticleProps {
  x: number;
  y: number;
  color: string;
  angle: number;
  distance: number;
  rotation: number;
}

interface PopExplosionProps {
  x: number;
  y: number;
  color: string;
  onComplete: () => void;
}

interface Letter {
  id: string;
  char: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  size: number;
  duration: number;
  delay: number;
  bgColor: string;
  borderColor: string;
  rotation: number;
}

interface Explosion {
  id: string;
  x: number;
  y: number;
  color: string;
}

interface ColorScheme {
  bg: string;
  border: string;
}

interface MenuAnimationProps {
  className?: string;
}

// Particle component for the pop/destruct effect
const PopParticle: React.FC<PopParticleProps> = ({ x, y, color, angle, distance, rotation }) => (
  <motion.div
    initial={{
      x,
      y,
      opacity: 1,
      scale: 1,
    }}
    animate={{
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance + 60, // Gravity pulls down
      opacity: 0,
      scale: 0,
      rotate: rotation,
    }}
    transition={{
      duration: 0.5,
      ease: "easeOut",
    }}
    style={{
      position: 'absolute',
      width: '10px',
      height: '10px',
      backgroundColor: color,
      border: '2px solid #000000',
      borderRadius: '2px',
    }}
  />
);

// Generate particles once on mount using lazy initialization
const generateParticles = (): ParticleData[] => Array(8).fill(null).map((_, i) => ({
  id: i,
  angle: (Math.PI * 2 / 8) * i + Math.random() * 0.3,
  distance: 40 + Math.random() * 50,
  rotation: Math.random() * 360,
}));

// Pop explosion effect at a specific position
const PopExplosion: React.FC<PopExplosionProps> = ({ x, y, color, onComplete }) => {
  // Use lazy state initialization to generate particles only once
  const [particles] = useState<ParticleData[]>(generateParticles);

  useEffect(() => {
    const timer = setTimeout(onComplete, 600);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <>
      {particles.map((particle) => (
        <PopParticle
          key={particle.id}
          x={x}
          y={y}
          color={color}
          angle={particle.angle}
          distance={particle.distance}
          rotation={particle.rotation}
        />
      ))}
    </>
  );
};

// Neo-Brutalist color palette - uses CSS variables from theme for consistency
// These map to the neo-* colors defined in globals.css and tailwind.config.js
const BRUTALIST_COLORS: ColorScheme[] = [
  { bg: 'var(--neo-yellow)', border: 'var(--neo-black)' },
  { bg: 'var(--neo-pink)', border: 'var(--neo-black)' },
  { bg: 'var(--neo-lime)', border: 'var(--neo-black)' },
  { bg: 'var(--neo-cyan)', border: 'var(--neo-black)' },
  { bg: 'var(--neo-orange)', border: 'var(--neo-black)' },
  { bg: 'var(--neo-purple-light)', border: 'var(--neo-black)' },
  { bg: 'var(--neo-cream)', border: 'var(--neo-black)' },
];

const MenuAnimation: React.FC<MenuAnimationProps> = ({ className = '' }) => {
  const { language, t } = useLanguage();
  // Initialize with empty array to avoid hydration mismatch (random values)
  const [letters, setLetters] = useState<Letter[]>([]);
  const [explosions, setExplosions] = useState<Explosion[]>([]);
  const explosionCounterRef = useRef(0);
  const [, setPoppedCount] = useState(0);
  const [showAchievement, setShowAchievement] = useState<Achievement | null>(null);
  const achievementShownRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  // Get letter set based on language
  const getLetterSet = useCallback((): string[] => {
    switch (language) {
      case 'he':
        return hebrewLetters;
      case 'sv':
        return swedishLetters;
      case 'ja':
        return japaneseLetters;
      case 'en':
      default:
        return englishLetters;
    }
  }, [language]);

  // Generate a single letter (only call client-side after mount)
  const generateLetter = useCallback((index: number): Letter => {
    const letterSet = getLetterSet();
    const colorScheme = BRUTALIST_COLORS[Math.floor(Math.random() * BRUTALIST_COLORS.length)];
    const width = window.innerWidth;
    const height = window.innerHeight;
    return {
      id: `letter-${index}-${Date.now()}-${Math.random()}`,
      char: letterSet[Math.floor(Math.random() * letterSet.length)],
      x: Math.random() * width,
      y: Math.random() * height,
      targetX: Math.random() * width,
      targetY: Math.random() * height,
      size: Math.random() * 35 + 35, // 35-70px
      duration: Math.random() * 15 + 12, // 12-27 seconds - slow float
      delay: Math.random() * 3,
      bgColor: colorScheme.bg,
      borderColor: colorScheme.border,
      rotation: Math.random() > 0.5 ? (Math.random() * 20 - 10) : 0,
    };
  }, [getLetterSet]);

  // Mark as mounted after initial render (client-side only)
  useEffect(() => {
    setMounted(true);
  }, []);

  // Generate initial letters only after mount (client-side)
  useEffect(() => {
    if (!mounted) return;

    const numberOfLetters = 18;
    const newLetters = Array(numberOfLetters).fill(null).map((_, index) =>
      generateLetter(index)
    );

    setLetters(newLetters);
  }, [mounted, language, generateLetter]);

  // Handle letter click - pop it!
  const handleLetterClick = useCallback((letter: Letter, event: React.MouseEvent<HTMLDivElement>) => {
    // Get click position for explosion
    const rect = event.currentTarget.getBoundingClientRect();
    const explosionX = rect.left + rect.width / 2;
    const explosionY = rect.top + rect.height / 2;

    // Add explosion - use counter for unique IDs (refs can be mutated in callbacks)
    explosionCounterRef.current += 1;
    const explosionId = `explosion-${explosionCounterRef.current}`;
    setExplosions(prev => [...prev, {
      id: explosionId,
      x: explosionX,
      y: explosionY,
      color: letter.bgColor,
    }]);

    // Remove the letter and spawn a new one
    setLetters(prev => prev.map(l =>
      l.id === letter.id ? generateLetter(prev.length) : l
    ));

    // Track popped letters count
    setPoppedCount(prevCount => {
      const newCount = prevCount + 1;

      // Check for achievement unlock (10+ letters popped)
      if (newCount >= 10 && !achievementShownRef.current) {
        // Check if already unlocked in localStorage
        const hasUnlocked = typeof window !== 'undefined' &&
          localStorage.getItem('achievement_LETTER_POPPER') === 'true';

        if (!hasUnlocked) {
          // Mark as unlocked
          if (typeof window !== 'undefined') {
            localStorage.setItem('achievement_LETTER_POPPER', 'true');
          }
          achievementShownRef.current = true;

          // Show achievement popup
          const achievement: Achievement = {
            id: 'LETTER_POPPER',
            name: t('achievements.LETTER_POPPER.name'),
            description: t('achievements.LETTER_POPPER.description'),
            icon: '🎈',
            unlockedAt: new Date().toISOString(),
            tier: 'bronze',
          };
          setShowAchievement(achievement);
        }
      }

      return newCount;
    });
  }, [generateLetter, t]);

  // Remove explosion after animation
  const handleExplosionComplete = (explosionId: string) => {
    setExplosions(prev => prev.filter(e => e.id !== explosionId));
  };

  return (
    <div
      className={`fixed inset-0 overflow-hidden ${className}`}
      style={{
        zIndex: 0,
        direction: 'ltr',
        pointerEvents: 'none', // Container doesn't block clicks
      }}
    >
      {/* Floating letters */}
      <AnimatePresence mode="sync">
        {letters.map((letter) => (
          <motion.div
            key={letter.id}
            initial={{
              x: letter.x,
              y: letter.y,
              opacity: 0,
              scale: 0.5,
              rotate: letter.rotation,
            }}
            animate={{
              x: [letter.x, letter.targetX],
              y: [letter.y, letter.targetY],
              opacity: [0, 0.5, 0.6, 0.5, 0],
              scale: [0.5, 1, 1, 1, 0.8],
              rotate: [letter.rotation, letter.rotation + 5, letter.rotation - 5, letter.rotation],
            }}
            transition={{
              duration: letter.duration,
              delay: letter.delay,
              repeat: Infinity,
              ease: "linear",
            }}
            onClick={(e) => handleLetterClick(letter, e)}
            whileHover={{
              opacity: 1,
              transition: { duration: 0.1 }
            }}
            className="absolute font-black flex items-center justify-center cursor-pointer select-none"
            style={{
              fontSize: `${letter.size}px`,
              fontFamily: (() => {
                switch (language) {
                  case 'he':
                    return "'Rubik', sans-serif";
                  case 'ja':
                    return "'Noto Sans JP', sans-serif";
                  case 'sv':
                  case 'en':
                  default:
                    return "'Inter', sans-serif";
                }
              })(),
              color: '#000000',
              backgroundColor: letter.bgColor,
              border: `3px solid ${letter.borderColor}`,
              borderRadius: '4px',
              padding: '4px 8px',
              boxShadow: '4px 4px 0px #000000',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              WebkitFontSmoothing: 'antialiased',
              MozOsxFontSmoothing: 'grayscale',
              direction: 'ltr',
              position: 'absolute',
              lineHeight: 1,
              pointerEvents: 'auto', // Letters are clickable
            }}
          >
            {letter.char}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Pop explosions */}
      {explosions.map((explosion) => (
        <PopExplosion
          key={explosion.id}
          x={explosion.x}
          y={explosion.y}
          color={explosion.color}
          onComplete={() => handleExplosionComplete(explosion.id)}
        />
      ))}

      {/* Achievement Popup */}
      {showAchievement && (
        <AchievementPopup
          achievement={showAchievement}
          onComplete={() => setShowAchievement(null)}
        />
      )}
    </div>
  );
};

export default MenuAnimation;
