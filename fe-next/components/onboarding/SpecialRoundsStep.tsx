'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * SpecialRoundsStep - Demonstrates earthquake and fire round special events
 * Shows animations of both special round types
 */
const SpecialRoundsStep: React.FC = () => {
  const { t } = useLanguage();
  const [earthquakeActive, setEarthquakeActive] = useState(false);
  const [fireRoundActive, setFireRoundActive] = useState(false);

  // Trigger earthquake animation loop
  useEffect(() => {
    const interval = setInterval(() => {
      setEarthquakeActive(true);
      setTimeout(() => setEarthquakeActive(false), 2000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Trigger fire round animation
  useEffect(() => {
    setTimeout(() => setFireRoundActive(true), 1000);
  }, []);

  // Mini demo letters
  const demoLetters = [
    ['W', 'O'],
    ['R', 'D'],
  ];

  // Rainbow colors for fire round
  const rainbowColors = [
    '#FFB3D9', // Soft pink
    '#FFB380', // Peachy orange
    '#FFE680', // Gentle yellow
    '#B3FFB3', // Mint green
  ];

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <h2 className="text-xl sm:text-2xl font-black text-neo-black uppercase">
          {t('onboarding.specialRounds.title')}
        </h2>
        <p className="text-xs sm:text-sm text-neo-black/70">
          {t('onboarding.specialRounds.subtitle')}
        </p>
      </motion.div>

      {/* Two panels - always 2 columns */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 w-full max-w-2xl">
        {/* Earthquake panel */}
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-neo-orange text-neo-black border-2 sm:border-3 border-neo-black rounded-neo p-2 sm:p-4 shadow-hard-sm sm:shadow-hard-md h-full">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <span className="text-lg sm:text-2xl">🌋</span>
              <h3 className="font-black text-xs sm:text-lg text-neo-black leading-tight">
                {t('onboarding.specialRounds.earthquake.title')}
              </h3>
            </div>
            <p className="text-[10px] sm:text-sm text-neo-black/80 mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-none">
              {t('onboarding.specialRounds.earthquake.description')}
            </p>

            {/* Demo grid with earthquake effect */}
            <div className="bg-neo-cream text-neo-black border-2 border-neo-black rounded-neo p-1.5 sm:p-3 relative overflow-hidden">
              <div className="grid grid-cols-2 gap-1 sm:gap-2">
                {demoLetters.map((row, rowIndex) =>
                  row.map((letter, colIndex) => (
                    <motion.div
                      key={`${rowIndex}-${colIndex}`}
                      className="aspect-square bg-neo-yellow border-2 border-neo-black rounded flex items-center justify-center font-black text-base sm:text-2xl"
                      animate={
                        earthquakeActive
                          ? {
                              x: [0, -10, 10, -8, 8, -5, 5, 0],
                              y: [0, 8, -8, 6, -6, 3, -3, 0],
                              rotate: [0, -5, 5, -3, 3, -2, 2, 0],
                            }
                          : {}
                      }
                      transition={{ duration: 0.5, repeat: earthquakeActive ? 3 : 0 }}
                    >
                      {letter}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-xs text-neo-black/70 text-center hidden sm:block">
              💡 {t('onboarding.specialRounds.earthquake.tip')}
            </div>
          </div>
        </motion.div>

        {/* Fire Round panel */}
        <motion.div
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-neo-pink text-white border-2 sm:border-3 border-neo-black rounded-neo p-2 sm:p-4 shadow-hard-sm sm:shadow-hard-md h-full">
            <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
              <span className="text-lg sm:text-2xl">💃</span>
              <h3 className="font-black text-xs sm:text-lg text-neo-black leading-tight">
                {t('onboarding.specialRounds.fireRound.title')}
              </h3>
            </div>
            <p className="text-[10px] sm:text-sm text-neo-black/80 mb-2 sm:mb-4 line-clamp-2 sm:line-clamp-none">
              {t('onboarding.specialRounds.fireRound.description')}
            </p>

            {/* Demo grid with fire round effect */}
            <div className="bg-neo-cream text-neo-black border-2 border-neo-black rounded-neo p-1.5 sm:p-3 relative overflow-hidden">
              <div className="grid grid-cols-2 gap-1 sm:gap-2">
                {demoLetters.map((row, rowIndex) =>
                  row.map((letter, colIndex) => {
                    const colorIndex = (rowIndex + colIndex) % rainbowColors.length;
                    return (
                      <motion.div
                        key={`${rowIndex}-${colIndex}`}
                        className="aspect-square border-2 border-neo-black rounded flex items-center justify-center font-black text-base sm:text-2xl"
                        style={{
                          backgroundColor: fireRoundActive
                            ? rainbowColors[colorIndex]
                            : '#FFFEF0',
                        }}
                        animate={
                          fireRoundActive
                            ? {
                                backgroundColor: rainbowColors,
                                scale: [1, 1.05, 1],
                              }
                            : {}
                        }
                        transition={{
                          backgroundColor: {
                            duration: 2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          },
                          scale: {
                            duration: 1.2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                          },
                        }}
                      >
                        {letter}
                      </motion.div>
                    );
                  })
                )}
              </div>

              {/* 2x multiplier badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 }}
                className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-neo-orange border-2 border-neo-black rounded-full px-1.5 sm:px-3 py-0.5 sm:py-1 font-black text-[10px] sm:text-sm shadow-hard-sm"
              >
                2x
              </motion.div>
            </div>

            <div className="mt-1.5 sm:mt-2 text-[9px] sm:text-xs text-neo-black/70 text-center hidden sm:block">
              💡 {t('onboarding.specialRounds.fireRound.tip')}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SpecialRoundsStep;
