import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaTrophy } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';
import confetti from 'canvas-confetti';

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

// Confetti burst on mount
const fireConfetti = () => {
  const count = 100;
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 1000,
  };

  function fire(particleRatio, opts) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

const ResultsWinnerBanner = ({ winner, isCurrentUserWinner }) => {
  const { t } = useLanguage();
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Randomly select a celebration image (once per winner)
  const randomImage = useMemo(() => {
    return celebrationImages[Math.floor(Math.random() * celebrationImages.length)];
  }, [winner?.username]);

  // Fire confetti on mount
  useEffect(() => {
    if (winner) {
      const timer = setTimeout(fireConfetti, 400);
      return () => clearTimeout(timer);
    }
  }, [winner?.username]);

  if (!winner) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="mb-4 sm:mb-6 md:mb-8 relative w-full"
    >
      {/* Outer glow */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-60"
        style={{
          background: 'linear-gradient(135deg, rgba(255,215,0,0.4), rgba(255,140,0,0.3))',
          filter: 'blur(12px)',
        }}
      />

      {/* Main Container */}
      <div
        className="relative rounded-2xl overflow-hidden min-h-[300px] md:min-h-[400px] border-2 border-yellow-500/60"
        style={{
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255,255,255,0.1)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Hero Background Image with scale animation */}
        <motion.div
          className="absolute inset-0"
          animate={{
            scale: isHovered ? 1.05 : 1,
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {!imageError ? (
            <motion.img
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              src={randomImage}
              alt="celebration"
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ filter: 'brightness(1.1) saturate(1.2)' }}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-purple-600" />
          )}

          {/* Overlay for text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
        </motion.div>

        {/* Glass glare effect - sweeping animation */}
        <motion.div
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ x: '-100%' }}
          animate={{ x: '200%' }}
          transition={{
            duration: 2,
            delay: 0.5,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatDelay: 4,
          }}
          style={{
            background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.3) 45%, rgba(255,255,255,0.5) 50%, rgba(255,255,255,0.3) 55%, transparent 60%)',
          }}
        />

        {/* Top glass reflection */}
        <div
          className="absolute inset-x-0 top-0 h-1/3 pointer-events-none z-10"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
          }}
        />

        {/* Central Winner Card */}
        <div className="relative z-20 flex items-center justify-center min-h-[300px] md:min-h-[400px] p-4 sm:p-6">
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.4, type: 'spring', stiffness: 100 }}
            className="relative max-w-2xl w-full"
          >
            {/* Glass Card */}
            <div
              className="relative rounded-2xl overflow-hidden p-5 sm:p-7 md:p-10 text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 40px rgba(0,0,0,0.2)',
              }}
            >
              {/* Card glass glare */}
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 40%, transparent 60%, rgba(255,255,255,0.1) 100%)',
                }}
              />

              {/* Animated Crown */}
              <motion.div
                initial={{ y: -20, opacity: 0, rotate: -15 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.4, type: 'spring', stiffness: 150 }}
                className="inline-block mb-4"
              >
                <motion.div
                  animate={{
                    y: [0, -8, 0],
                    rotate: [0, -5, 5, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    repeatDelay: 1,
                    ease: 'easeInOut',
                  }}
                  whileHover={{ scale: 1.2 }}
                  className="cursor-pointer"
                >
                  <FaCrown
                    className="text-5xl sm:text-6xl md:text-7xl text-yellow-300"
                    style={{
                      filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.6)) drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                    }}
                  />
                </motion.div>
              </motion.div>

              {/* You Won! Message for current user */}
              {isCurrentUserWinner && (
                <motion.p
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-300 mb-2"
                  style={{
                    textShadow: '0 0 20px rgba(255,215,0,0.8), 0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  {t('results.youWon')}
                </motion.p>
              )}

              {/* Winner Announcement Text */}
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55 }}
                className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}
              >
                {t('results.winnerAnnouncement')}
              </motion.h2>

              {/* Winner Name with pulse animation */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: 'spring', stiffness: 120 }}
                className="mb-4"
              >
                <motion.h1
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  whileHover={{ scale: 1.05 }}
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #FFFFFF 0%, #FFE066 25%, #FFD700 50%, #FFA500 75%, #FFD700 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.4))',
                  }}
                  onClick={fireConfetti}
                >
                  {winner.username}!
                </motion.h1>
              </motion.div>

              {/* Score Display with trophy animation */}
              <motion.div
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-center gap-3"
              >
                <motion.div
                  animate={{ rotate: [0, -10, 10, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                  whileHover={{ scale: 1.3 }}
                  className="cursor-pointer"
                  onClick={fireConfetti}
                >
                  <FaTrophy
                    className="text-3xl sm:text-4xl text-yellow-300"
                    style={{ filter: 'drop-shadow(0 0 10px rgba(255,215,0,0.5))' }}
                  />
                </motion.div>
                <motion.p
                  animate={{ scale: [1, 1.03, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-2xl sm:text-3xl md:text-4xl font-black text-white"
                  style={{
                    textShadow: '0 0 15px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.4)',
                  }}
                >
                  {winner.score} {t('results.points')}
                </motion.p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
