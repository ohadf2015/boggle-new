/**
 * VictoryCelebration Component
 *
 * Spectacular victory screen with confetti, star animations, and celebration effects.
 * Creates a memorable moment for level completion.
 */

'use client';

import React, { useEffect, useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles, Trophy, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import RollingNumber from './RollingNumber';

// ==============================================
// TYPES
// ==============================================

interface VictoryCelebrationProps {
  stars: number;
  score: number;
  xpGained: number;
  goldGained: number;
  isPerfect: boolean;
  onComplete?: () => void;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
  type: 'confetti' | 'sparkle' | 'coin';
}

// ==============================================
// CONSTANTS
// ==============================================

const COLORS = [
  '#FFE135', // yellow
  '#FF6B35', // orange
  '#FF1493', // pink
  '#00FFFF', // cyan
  '#A3E635', // lime
  '#A855F7', // purple
];

// ==============================================
// COMPONENT
// ==============================================

export const VictoryCelebration = memo(function VictoryCelebration({
  stars,
  score,
  xpGained,
  goldGained,
  isPerfect,
  onComplete,
  className,
}: VictoryCelebrationProps) {
  const { t } = useLanguage();
  const [particles, setParticles] = useState<Particle[]>([]);
  const [showContent, setShowContent] = useState(false);

  // Generate celebration particles
  useEffect(() => {
    const newParticles: Particle[] = [];
    
    // Confetti burst
    for (let i = 0; i < 50; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: -10 - Math.random() * 20,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        delay: Math.random() * 0.5,
        type: 'confetti',
      });
    }

    // Sparkles
    for (let i = 50; i < 80; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: 20 + Math.random() * 60,
        rotation: 0,
        scale: 0.3 + Math.random() * 0.4,
        color: '#FFFFFF',
        delay: Math.random() * 1,
        type: 'sparkle',
      });
    }

    // Coins for gold gain
    if (goldGained > 0) {
      for (let i = 80; i < 100; i++) {
        newParticles.push({
          id: i,
          x: 30 + Math.random() * 40,
          y: -10,
          rotation: 0,
          scale: 0.4 + Math.random() * 0.3,
          color: '#FFE135',
          delay: 0.5 + Math.random() * 0.5,
          type: 'coin',
        });
      }
    }

    setParticles(newParticles);

    // Show content after initial burst
    const timer = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(timer);
  }, [goldGained]);

  return (
    <div className={cn('fixed inset-0 z-50 flex items-center justify-center pointer-events-none', className)}>
      {/* Dark overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-neo-navy/80"
      />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            initial={{ 
              x: `${particle.x}%`, 
              y: `${particle.y}%`,
              rotate: particle.rotation,
              scale: 0,
              opacity: 0,
            }}
            animate={{ 
              y: `${particle.y + 120}%`,
              rotate: particle.rotation + 720,
              scale: particle.scale,
              opacity: [0, 1, 1, 0],
            }}
            transition={{
              duration: particle.type === 'coin' ? 1.5 : 3,
              delay: particle.delay,
              ease: particle.type === 'coin' ? 'easeOut' : 'linear',
            }}
            className="absolute"
            style={{
              left: `${particle.x}%`,
            }}
          >
            {particle.type === 'confetti' && (
              <div 
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: particle.color }}
              />
            )}
            {particle.type === 'sparkle' && (
              <Sparkles 
                className="w-4 h-4"
                style={{ color: particle.color }}
              />
            )}
            {particle.type === 'coin' && (
              <div 
                className="w-6 h-6 rounded-full border-2 border-neo-yellow flex items-center justify-center text-xs font-bold"
                style={{ 
                  backgroundColor: '#FFE135',
                  color: '#000',
                }}
              >
                $
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Main content */}
      <AnimatePresence>
        {showContent && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative z-10 text-center pointer-events-auto"
          >
            {/* Victory title */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h2 className={cn(
                'text-5xl sm:text-6xl font-black uppercase tracking-tight',
                isPerfect ? 'text-transparent bg-clip-text bg-gradient-to-r from-neo-yellow via-neo-pink to-neo-cyan' : 'text-neo-yellow'
              )}>
                {isPerfect ? t('adventure.perfect') || 'PERFECT!' : t('adventure.victory') || 'VICTORY!'}
              </h2>
              {isPerfect && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="flex items-center justify-center gap-2 mt-2"
                >
                  <Trophy className="w-6 h-6 text-neo-yellow" />
                  <span className="text-neo-yellow font-bold">{t('adventure.allStars') || 'All Stars Collected!'}</span>
                </motion.div>
              )}
            </motion.div>

            {/* Stars display */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="flex items-center justify-center gap-4 mb-8"
            >
              {[1, 2, 3].map((starNum) => (
                <motion.div
                  key={starNum}
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ 
                    scale: starNum <= stars ? 1 : 0.5, 
                    rotate: 0,
                    opacity: starNum <= stars ? 1 : 0.3,
                  }}
                  transition={{ delay: 0.4 + starNum * 0.1, type: 'spring' }}
                >
                  <Star 
                    className={cn(
                      'w-16 h-16 sm:w-20 sm:h-20',
                      starNum <= stars 
                        ? 'text-neo-yellow fill-neo-yellow drop-shadow-[0_0_20px_rgba(255,225,53,0.8)]' 
                        : 'text-neo-white/30'
                    )}
                  />
                </motion.div>
              ))}
            </motion.div>

            {/* Stats grid */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-3 gap-4 max-w-md mx-auto"
            >
              {/* Score */}
              <div className="bg-neo-black/60 backdrop-blur-sm border-3 border-neo-white/20 rounded-neo p-4">
                <div className="text-neo-white/60 text-sm font-bold mb-1">{t('adventure.score') || 'Score'}</div>
                <RollingNumber 
                  value={score} 
                  variant="white"
                  className="text-2xl"
                />
              </div>

              {/* XP */}
              <div className="bg-neo-purple/20 backdrop-blur-sm border-3 border-neo-purple rounded-neo p-4">
                <div className="text-neo-purple text-sm font-bold mb-1">+XP</div>
                <RollingNumber 
                  value={xpGained} 
                  variant="default"
                  className="text-2xl text-neo-purple"
                />
              </div>

              {/* Gold */}
              <div className="bg-neo-yellow/20 backdrop-blur-sm border-3 border-neo-yellow rounded-neo p-4">
                <div className="text-neo-yellow text-sm font-bold mb-1 flex items-center gap-1 justify-center">
                  <Coins className="w-3 h-3" />
                  Gold
                </div>
                <RollingNumber 
                  value={goldGained} 
                  variant="gold"
                  className="text-2xl"
                />
              </div>
            </motion.div>

            {/* Continue button */}
            <motion.button
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onComplete}
              className={cn(
                'mt-8 px-8 py-4 rounded-neo-lg font-black text-xl uppercase',
                'bg-neo-lime text-neo-black border-4 border-neo-black',
                'shadow-hard-lg hover:shadow-hard transition-all',
                'pointer-events-auto'
              )}
            >
              {t('adventure.continue') || 'Continue'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

VictoryCelebration.displayName = 'VictoryCelebration';

export default VictoryCelebration;
