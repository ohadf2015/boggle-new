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

const ResultsWinnerBanner = ({ winner, isCurrentUserWinner }) => {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);

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
      {/* Outer Glow Effects - reduced blur for cleaner appearance */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-orange-500/30 to-yellow-400/20 rounded-3xl blur-xl animate-pulse" />
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/15 via-purple-500/15 to-teal-400/15 rounded-3xl blur-lg"
           style={{ animation: 'gradient-xy 8s ease infinite' }} />

      {/* Main Container with Hero Background Image */}
      <div className="relative rounded-3xl overflow-hidden shadow-2xl min-h-[400px] md:min-h-[500px]">
        {/* Hero Background Image with Clear Glass Effect */}
        <div className="absolute inset-0">
          {!imageError ? (
            <motion.img
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              src={randomImage}
              alt="celebration"
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{
                filter: 'brightness(1.15) saturate(1.4) contrast(1.1)',
              }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-purple-600" />
          )}
          {/* Clear glass effect - light reflections only, no blur */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10 pointer-events-none" />
          {/* Subtle edge highlight like glass edges catch light */}
          <div className="absolute inset-0 rounded-3xl shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1)] pointer-events-none" />
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
              {/* Glass Effect - reduced blur for clearer image visibility */}
              <div className="absolute inset-0 bg-white/10 border-2 border-white/40 rounded-2xl"
                   style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.4)' }} />
              {/* Glass glare effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none rounded-2xl" />

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

                {/* You Won! Message for current user */}
                {isCurrentUserWinner && (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.7, type: 'spring', stiffness: 200 }}
                    className="mb-2"
                  >
                    <motion.p
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="text-3xl sm:text-4xl md:text-5xl font-black text-yellow-300"
                      style={{
                        textShadow: '0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,215,0,0.8), 0 4px 12px rgba(0,0,0,0.5)',
                      }}
                    >
                      {t('results.youWon')}
                    </motion.p>
                  </motion.div>
                )}

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
