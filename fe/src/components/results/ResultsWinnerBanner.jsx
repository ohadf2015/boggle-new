import React from 'react';
import { motion } from 'framer-motion';
import { FaCrown, FaMedal, FaTrophy } from 'react-icons/fa';
import { Card } from '../ui/card';
import { useLanguage } from '../../contexts/LanguageContext';

const ResultsWinnerBanner = ({ winner }) => {
  const { t } = useLanguage();

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
      className="mb-8 relative"
    >
      {/* Glowing Background */}
      <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-yellow-500/30 to-orange-500/20 rounded-2xl blur-2xl animate-pulse" />

      <Card className="relative bg-gradient-to-r from-yellow-500/95 via-yellow-600/95 to-orange-500/95 border-4 border-yellow-300/50 shadow-2xl shadow-yellow-500/40 backdrop-blur-md overflow-hidden">
        {/* Animated Background Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/30 rounded-full"
              animate={{
                y: [0, -300],
                x: [0, (i % 2 === 0 ? 1 : -1) * (50 + i * 10)],
                opacity: [0.5, 0],
                scale: [1, 0]
              }}
              transition={{
                duration: 3 + i * 0.2,
                repeat: Infinity,
                delay: i * 0.2,
                ease: 'easeOut'
              }}
              style={{
                left: `${5 + (i * 5)}%`,
                bottom: 0
              }}
            />
          ))}
        </div>

        <div className="p-8 text-center relative z-10">
          {/* Animated Crown */}
          <motion.div
            animate={{
              rotate: [0, -10, 10, -10, 10, 0],
              y: [0, -10, 0],
              scale: [1, 1.1, 1, 1.1, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              repeatDelay: 2
            }}
            className="inline-block mb-4"
          >
            <FaCrown className="text-7xl text-white drop-shadow-2xl" />
          </motion.div>

          {/* Winner Announcement */}
          <motion.h2
            animate={{
              scale: [1, 1.05, 1],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="text-4xl md:text-6xl font-black text-white drop-shadow-2xl mb-3"
          >
            {t('results.winnerAnnouncement')}
          </motion.h2>

          {/* Winner Name */}
          <motion.div
            animate={{
              y: [0, -5, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            className="text-5xl md:text-6xl font-black text-white drop-shadow-2xl mb-4"
          >
            {winner.username}!
          </motion.div>

          {/* Score */}
          <motion.p
            animate={{
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5
            }}
            className="text-3xl font-bold text-white/95 mb-4"
          >
            {winner.score} {t('results.points')}
          </motion.p>

          {/* Trophy Icons */}
          <div className="flex justify-center gap-4 mt-4">
            {[FaTrophy, FaMedal, FaTrophy].map((Icon, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -15, 0],
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: 'easeInOut'
                }}
              >
                <Icon className="text-4xl text-white drop-shadow-lg" />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Decorative Corner Elements */}
        <div className="absolute top-0 left-0 w-20 h-20 border-t-4 border-l-4 border-white/30 rounded-tl-2xl" />
        <div className="absolute top-0 right-0 w-20 h-20 border-t-4 border-r-4 border-white/30 rounded-tr-2xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-b-4 border-l-4 border-white/30 rounded-bl-2xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-b-4 border-r-4 border-white/30 rounded-br-2xl" />
      </Card>
    </motion.div>
  );
};

export default ResultsWinnerBanner;
