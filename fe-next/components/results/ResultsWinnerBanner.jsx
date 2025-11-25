import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCrown, FaMedal, FaTrophy } from 'react-icons/fa';
import { Card } from '../ui/card';
import { useLanguage } from '../../contexts/LanguageContext';

const celebrationImages = [
  '/winner-celebration/trophy-confetti.png',
  '/winner-celebration/crown-sparkles.png',
  '/winner-celebration/medal-stars.png',
  '/winner-celebration/fireworks-burst.png',
  '/winner-celebration/champion-ribbon.png',
  '/winner-celebration/laurel-wreath.png',
  '/winner-celebration/celebration-balloons.png',
  '/winner-celebration/winner-podium.png',
  '/winner-celebration/star-burst.png',
  '/winner-celebration/thumbs-up.png',
];

const ResultsWinnerBanner = ({ winner }) => {
  const { t } = useLanguage();

  // Randomly select a celebration image (once per winner)
  const randomImage = useMemo(() => {
    return celebrationImages[Math.floor(Math.random() * celebrationImages.length)];
  }, [winner?.username]);

  if (!winner) return null;

  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180, y: -100 }}
      animate={{ scale: 1, rotateY: 0, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 200,
        damping: 15,
        delay: 0.3
      }}
      className="mb-4 sm:mb-6 md:mb-8 relative w-full"
    >
      {/* Outer Glow Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/30 via-orange-500/40 to-yellow-400/30 rounded-3xl blur-3xl animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-purple-500/20 to-teal-400/20 rounded-3xl blur-2xl"
           style={{ animation: 'gradient-xy 8s ease infinite' }} />

      {/* Main Container with Hero Background Image */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[400px] md:min-h-[500px]">
        {/* Hero Background Image with Blur and Overlay */}
        <div className="absolute inset-0">
          <motion.img
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            src={randomImage}
            alt="celebration"
            className="absolute inset-0 w-full h-full object-cover"
            style={{
              filter: 'blur(8px) brightness(1.1) saturate(1.4)',
            }}
          />
          {/* Gradient Overlays for Depth */}
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/60 via-orange-500/50 to-yellow-400/60"
               style={{ mixBlendMode: 'multiply' }} />
          <div className="absolute inset-0 bg-gradient-radial from-transparent via-yellow-500/20 to-orange-600/40" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/20" />
        </div>

        {/* Floating Particles Animation */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white/60"
              style={{
                width: `${4 + Math.random() * 8}px`,
                height: `${4 + Math.random() * 8}px`,
                left: `${Math.random() * 100}%`,
                bottom: 0,
              }}
              animate={{
                y: [0, -500 - Math.random() * 200],
                x: [(i % 2 === 0 ? 1 : -1) * (30 + Math.random() * 50)],
                opacity: [0.8, 0],
                scale: [1, 0.3]
              }}
              transition={{
                duration: 4 + Math.random() * 3,
                repeat: Infinity,
                delay: i * 0.15,
                ease: 'easeOut'
              }}
            />
          ))}
        </div>

        {/* Central Glassmorphic Winner Card */}
        <div className="relative z-10 flex items-center justify-center min-h-[400px] md:min-h-[500px] p-6 sm:p-8 md:p-12">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            transition={{
              type: 'spring',
              stiffness: 150,
              damping: 20,
              delay: 0.5
            }}
            className="relative max-w-3xl w-full"
          >
            {/* Glassmorphic Card */}
            <div className="relative rounded-2xl overflow-hidden">
              {/* Glass Effect */}
              <div className="absolute inset-0 bg-white/15 backdrop-blur-xl border-2 border-white/30 rounded-2xl"
                   style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)' }} />

              {/* Animated Border Glow */}
              <motion.div
                animate={{
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                className="absolute inset-0 rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,215,0,0.4), rgba(255,140,0,0.4), rgba(255,215,0,0.4))',
                  filter: 'blur(8px)',
                  zIndex: -1
                }}
              />

              {/* Card Content */}
              <div className="relative p-6 sm:p-8 md:p-12 text-center">
                {/* Animated Crown */}
                <motion.div
                  initial={{ y: -30, opacity: 0, rotate: -20 }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    rotate: 0
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 200,
                    damping: 12,
                    delay: 0.7
                  }}
                >
                  <motion.div
                    animate={{
                      rotate: [0, -8, 8, -8, 8, 0],
                      y: [0, -12, 0],
                      scale: [1, 1.15, 1]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      repeatDelay: 2,
                      ease: 'easeInOut'
                    }}
                    className="inline-block mb-4 sm:mb-6"
                  >
                    <FaCrown className="text-6xl sm:text-7xl md:text-8xl text-yellow-300 drop-shadow-[0_0_30px_rgba(255,215,0,0.8)]"
                             style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }} />
                  </motion.div>
                </motion.div>

                {/* Winner Announcement Text */}
                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4"
                  style={{
                    textShadow: '0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,215,0,0.5), 0 4px 12px rgba(0,0,0,0.5)',
                    letterSpacing: '0.05em'
                  }}
                >
                  {t('results.winnerAnnouncement')}
                </motion.h2>

                {/* Winner Name - Giant Gradient Text */}
                <motion.div
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 180,
                    damping: 15,
                    delay: 1.1
                  }}
                  className="mb-4 sm:mb-6"
                >
                  <motion.h1
                    animate={{
                      scale: [1, 1.03, 1],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black relative"
                    style={{ lineHeight: 1.2 }}
                  >
                    {/* Glow Layer */}
                    <span className="absolute inset-0 blur-xl opacity-80"
                          style={{
                            background: 'linear-gradient(135deg, #FFD700, #FFA500, #FFD700)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}>
                      {winner.username}!
                    </span>
                    {/* Main Text */}
                    <span className="relative"
                          style={{
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFE066 20%, #FFD700 40%, #FFA500 60%, #FFD700 80%, #FFFFFF 100%)',
                            backgroundSize: '200% 200%',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: '0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,165,0,0.6), 0 8px 16px rgba(0,0,0,0.4)',
                            filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))',
                            animation: 'gradient-x 4s ease infinite'
                          }}>
                      {winner.username}!
                    </span>
                  </motion.h1>
                </motion.div>

                {/* Score Display */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                  className="flex items-center justify-center gap-3 sm:gap-4"
                >
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                  >
                    <FaTrophy className="text-3xl sm:text-4xl md:text-5xl text-yellow-300 drop-shadow-lg" />
                  </motion.div>
                  <motion.p
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: 'easeInOut'
                    }}
                    className="text-3xl sm:text-4xl md:text-5xl font-black text-white"
                    style={{
                      textShadow: '0 0 20px rgba(255,255,255,0.8), 0 0 40px rgba(255,215,0,0.6), 0 4px 12px rgba(0,0,0,0.5)',
                    }}
                  >
                    {winner.score} {t('results.points')}
                  </motion.p>
                </motion.div>

                {/* Decorative Trophy Icons */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                  className="flex justify-center gap-4 sm:gap-6 mt-6 sm:mt-8"
                >
                  {[FaTrophy, FaMedal, FaTrophy].map((Icon, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        y: [0, -12, 0],
                        rotate: [0, 15, -15, 0]
                      }}
                      transition={{
                        duration: 2.5,
                        repeat: Infinity,
                        delay: i * 0.4,
                        ease: 'easeInOut'
                      }}
                    >
                      <Icon className="text-2xl sm:text-3xl md:text-4xl text-white/90 drop-shadow-lg" />
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
