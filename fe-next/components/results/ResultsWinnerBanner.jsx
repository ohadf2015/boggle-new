import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCrown, FaTrophy } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';
import confetti from 'canvas-confetti';
import { SiKofi } from 'react-icons/si';

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

  // Fire confetti on mount
  useEffect(() => {
    if (winner) {
      const timer = setTimeout(fireConfetti, 400);
      return () => clearTimeout(timer);
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="mb-4 sm:mb-6 md:mb-8 relative w-full"
    >
      {/* Neo-Brutalist Main Container */}
      <div
        className="relative bg-neo-yellow border-4 border-neo-black rounded-neo-lg shadow-hard-xl overflow-hidden"
        style={{ transform: 'rotate(-1deg)' }}
      >
        {/* Halftone texture pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle, var(--neo-black) 1px, transparent 1px)`,
            backgroundSize: '8px 8px',
          }}
        />

        {/* Content */}
        <div className="relative z-10 p-6 sm:p-8 md:p-12 text-center">
          {/* Animated Crown - Neo-Brutalist */}
          <motion.div
            initial={{ y: -20, opacity: 0, rotate: -15 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 150 }}
            className="inline-block mb-4"
          >
            <motion.div
              animate={{
                y: [0, -6, 0],
                rotate: [0, -3, 3, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                repeatDelay: 1,
                ease: 'easeInOut',
              }}
              whileHover={{ scale: 1.1 }}
              className="cursor-pointer"
              onClick={fireConfetti}
            >
              <div className="bg-neo-cream border-4 border-neo-black rounded-neo p-3 shadow-hard inline-block">
                <FaCrown
                  className="text-5xl sm:text-6xl md:text-7xl text-neo-yellow"
                  style={{
                    filter: 'drop-shadow(3px 3px 0px var(--neo-black))',
                  }}
                />
              </div>
            </motion.div>
          </motion.div>

          {/* You Won! Message for current user */}
          {isCurrentUserWinner && (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -5 }}
              animate={{ scale: 1, opacity: 1, rotate: 3 }}
              transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
              className="mb-4"
            >
              <span
                className="inline-block bg-neo-pink text-neo-cream text-2xl sm:text-3xl md:text-4xl font-black uppercase px-4 py-2 border-4 border-neo-black rounded-neo shadow-hard"
                style={{ textShadow: '2px 2px 0px var(--neo-black)' }}
              >
                {t('results.youWon')}
              </span>
            </motion.div>
          )}

          {/* Winner Announcement Text */}
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="text-lg sm:text-xl md:text-2xl font-black text-neo-black uppercase tracking-wide mb-3"
          >
            {t('results.winnerAnnouncement')}
          </motion.h2>

          {/* Winner Name - Neo-Brutalist style */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
            className="mb-6"
          >
            <motion.div
              whileHover={{ scale: 1.02, rotate: 1 }}
              className="cursor-pointer inline-block"
              onClick={fireConfetti}
            >
              <h1
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-neo-black uppercase"
                style={{
                  textShadow: '4px 4px 0px var(--neo-cyan)',
                  letterSpacing: '0.02em',
                }}
              >
                {winner.username}!
              </h1>
            </motion.div>
          </motion.div>

          {/* Score Display - Neo-Brutalist badge */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex items-center justify-center gap-4"
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
              whileHover={{ scale: 1.2 }}
              className="cursor-pointer"
              onClick={fireConfetti}
            >
              <FaTrophy
                className="text-3xl sm:text-4xl text-neo-black"
                style={{ filter: 'drop-shadow(2px 2px 0px var(--neo-orange))' }}
              />
            </motion.div>
            <div
              className="bg-neo-cream border-4 border-neo-black rounded-neo px-6 py-3 shadow-hard"
            >
              <p
                className="text-2xl sm:text-3xl md:text-4xl font-black text-neo-black"
              >
                {winner.score} {t('results.points')}
              </p>
            </div>
          </motion.div>

          {/* Ko-fi Support Button - Shows after victory celebration */}
          {isCurrentUserWinner && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 1.2, type: 'spring', stiffness: 120 }}
              className="mt-6 flex justify-center"
            >
              <motion.a
                href="https://ko-fi.com/lexiclash"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{
                  scale: 1.05,
                  rotate: [0, -2, 2, 0],
                  transition: { rotate: { duration: 0.3 } }
                }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Fire celebration confetti when clicking support
                  confetti({
                    particleCount: 50,
                    spread: 60,
                    origin: { y: 0.8 },
                    colors: ['#FF5E5B', '#FFED66', '#00CECB'],
                  });
                }}
                className="
                  group
                  inline-flex items-center gap-2
                  px-5 py-3
                  bg-gradient-to-r from-[#FF5E5B] to-[#FF1493]
                  text-neo-cream
                  font-black
                  text-sm sm:text-base
                  uppercase
                  tracking-wide
                  border-4 border-neo-black
                  rounded-neo
                  shadow-hard
                  hover:shadow-hard-lg
                  transition-shadow
                  cursor-pointer
                "
                style={{ textShadow: '1px 1px 0px var(--neo-black)' }}
              >
                <motion.span
                  animate={{
                    rotate: [0, -10, 10, 0],
                    scale: [1, 1.1, 1]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                >
                  <SiKofi className="text-xl" />
                </motion.span>
                <span>{t('support.kofiWinner')}</span>
                <motion.span
                  className="text-lg"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                >
                  ☕
                </motion.span>
              </motion.a>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
