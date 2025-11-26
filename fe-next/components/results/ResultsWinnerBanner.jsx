import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaTrophy } from 'react-icons/fa';
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
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mb-4 sm:mb-6 md:mb-8 relative w-full"
    >
      {/* Main Container with Hero Background Image */}
      <div
        className="relative rounded-2xl overflow-hidden min-h-[280px] md:min-h-[380px] border-2 border-yellow-500/50 shadow-xl"
      >
        {/* Hero Background Image */}
        <div className="absolute inset-0">
          {!imageError ? (
            <img
              src={randomImage}
              alt="celebration"
              onError={() => setImageError(true)}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 via-orange-500 to-purple-600" />
          )}

          {/* Simple overlay for text readability */}
          <div className="absolute inset-0 bg-black/30" />
        </div>

        {/* Central Winner Card */}
        <div className="relative z-10 flex items-center justify-center min-h-[280px] md:min-h-[380px] p-4 sm:p-6">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            className="relative max-w-2xl w-full"
          >
            {/* Simple Glass Card */}
            <div
              className="relative rounded-xl overflow-hidden p-4 sm:p-6 md:p-8 text-center bg-white/15 border border-white/30"
              style={{ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
            >
              {/* Crown */}
              <motion.div
                initial={{ y: -15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-block mb-3"
              >
                <FaCrown
                  className="text-5xl sm:text-6xl md:text-7xl text-yellow-300"
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
                />
              </motion.div>

              {/* You Won! Message for current user */}
              {isCurrentUserWinner && (
                <motion.p
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-300 mb-2"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
                >
                  {t('results.youWon')}
                </motion.p>
              )}

              {/* Winner Announcement Text */}
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45 }}
                className="text-lg sm:text-xl md:text-2xl font-bold text-white mb-2"
                style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
              >
                {t('results.winnerAnnouncement')}
              </motion.h2>

              {/* Winner Name */}
              <motion.h1
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-3 text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #FFD700 50%, #FFA500 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  filter: 'drop-shadow(0 2px 6px rgba(255,215,0,0.5))',
                }}
              >
                {winner.username}!
              </motion.h1>

              {/* Score Display */}
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="flex items-center justify-center gap-2 sm:gap-3"
              >
                <FaTrophy className="text-2xl sm:text-3xl text-yellow-300" />
                <p
                  className="text-2xl sm:text-3xl md:text-4xl font-black text-white"
                  style={{ textShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
                >
                  {winner.score} {t('results.points')}
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
