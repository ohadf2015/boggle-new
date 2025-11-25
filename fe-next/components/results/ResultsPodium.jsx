import React from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaMedal, FaTrophy } from 'react-icons/fa';
import { useLanguage } from '../../contexts/LanguageContext';

const PodiumPlace = ({ player, place, delay }) => {
  const { t } = useLanguage();

  const heights = {
    1: 'h-36',
    2: 'h-28',
    3: 'h-20'
  };

  const widths = {
    1: 'w-24',
    2: 'w-20',
    3: 'w-20'
  };

  const gradients = {
    1: 'from-yellow-500 via-yellow-400 to-yellow-300',
    2: 'from-gray-400 via-gray-300 to-gray-200',
    3: 'from-orange-500 via-orange-400 to-orange-300'
  };

  const borderColors = {
    1: 'border-yellow-300',
    2: 'border-gray-300',
    3: 'border-orange-300'
  };

  const glowColors = {
    1: 'shadow-[0_0_30px_rgba(234,179,8,0.6)]',
    2: 'shadow-[0_0_20px_rgba(156,163,175,0.4)]',
    3: 'shadow-[0_0_20px_rgba(249,115,22,0.4)]'
  };

  const icons = {
    1: <FaCrown className="text-3xl text-yellow-300 drop-shadow-lg" />,
    2: <FaMedal className="text-2xl text-gray-300 drop-shadow-md" />,
    3: <FaTrophy className="text-2xl text-orange-300 drop-shadow-md" />
  };

  const medals = {
    1: '🥇',
    2: '🥈',
    3: '🥉'
  };

  if (!player) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0, scale: 0.8 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{
        delay: delay,
        type: 'spring',
        stiffness: 150,
        damping: 12
      }}
      className="flex flex-col items-center"
      style={{ zIndex: place === 1 ? 20 : 10 }}
    >
      {/* Crown Animation for 1st place */}
      {place === 1 && (
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, -5, 5, -5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1
          }}
          className="mb-2"
        >
          {icons[place]}
        </motion.div>
      )}

      {/* Player Info Card */}
      <motion.div
        whileHover={{ scale: 1.05, y: -5 }}
        className={`mb-2 text-center p-2 rounded-lg bg-gradient-to-br ${gradients[place]} border-2 ${borderColors[place]} ${glowColors[place]} backdrop-blur-md`}
        style={{ minWidth: '100px' }}
      >
        <motion.div
          animate={place === 1 ? {
            scale: [1, 1.1, 1],
          } : {}}
          transition={place === 1 ? {
            duration: 1.5,
            repeat: Infinity,
            repeatDelay: 2
          } : {}}
          className="text-2xl mb-0.5"
        >
          {medals[place]}
        </motion.div>
        <div className="text-base font-bold text-white drop-shadow-md truncate px-1">
          {player.username}
        </div>
        <div className="text-sm font-bold text-white/90 mt-0.5">
          {player.score} {t('results.points').slice(0, 3)}
        </div>
        <div className="text-xs text-white/70 mt-0.5">
          {player.wordCount} {t('playerView.wordCount')}
        </div>
      </motion.div>

      {/* Podium Base with Animation */}
      <motion.div
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{
          delay: delay + 0.3,
          type: 'spring',
          stiffness: 100,
          damping: 15
        }}
        className={`${widths[place]} ${heights[place]} bg-gradient-to-t ${gradients[place]} rounded-t-xl shadow-2xl flex items-end justify-center pb-3 border-t-4 ${borderColors[place]} ${glowColors[place]} relative overflow-hidden`}
        style={{ transformOrigin: 'bottom' }}
      >
        {/* Podium Number */}
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.5 }}
          className="text-5xl font-black text-white absolute bottom-1"
          style={{
            textShadow: '0 4px 8px rgba(0, 0, 0, 0.5), 0 2px 4px rgba(0, 0, 0, 0.3)',
            WebkitTextStroke: '2px rgba(0, 0, 0, 0.2)'
          }}
        >
          {place}
        </motion.span>

        {/* Animated Particles */}
        {place === 1 && (
          <>
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full"
                animate={{
                  y: [-20, -80],
                  x: [0, (i % 2 === 0 ? 1 : -1) * (20 + i * 5)],
                  opacity: [1, 0],
                  scale: [1, 0]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeOut'
                }}
                style={{
                  bottom: '10%',
                  left: '50%'
                }}
              />
            ))}
          </>
        )}
      </motion.div>

      {/* Reflection Effect */}
      <div className="w-full h-4 bg-gradient-to-b from-white/10 to-transparent rounded-b-xl blur-sm" />
    </motion.div>
  );
};

const ResultsPodium = ({ sortedScores }) => {

  return (
    <div className="mb-12 relative">
      {/* Stage Platform */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-2xl h-8 bg-gradient-to-r from-transparent via-slate-600/30 to-transparent rounded-lg blur-sm" />

      {/* Podium Arrangement */}
      <div className="flex justify-center items-end gap-4 md:gap-6 min-h-[180px] relative px-4">
        {/* 2nd Place */}
        {sortedScores[1] && (
          <PodiumPlace player={sortedScores[1]} place={2} delay={0.3} />
        )}

        {/* 1st Place */}
        {sortedScores[0] && (
          <PodiumPlace player={sortedScores[0]} place={1} delay={0.1} />
        )}

        {/* 3rd Place */}
        {sortedScores[2] && (
          <PodiumPlace player={sortedScores[2]} place={3} delay={0.5} />
        )}
      </div>

      {/* Spotlight Effect */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-96 h-96 bg-gradient-radial from-yellow-400/20 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />
    </div>
  );
};

export default ResultsPodium;
