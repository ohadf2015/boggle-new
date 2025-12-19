'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaGamepad, FaUsers, FaTrophy, FaClock, FaStar, FaFire, FaLevelUpAlt,
  FaMedal, FaChevronRight, FaChevronLeft, FaPlay, FaRedo, FaLightbulb,
  FaBolt, FaCheck, FaTimes, FaHandPointer, FaVolumeUp
} from 'react-icons/fa';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useLanguage } from '../contexts/LanguageContext';
import type { IconType } from 'react-icons';

/**
 * Demo word sequence item
 */
interface DemoWord {
  word: string;
  path: [number, number][];
  points: number;
}

/**
 * Interactive Grid Demo Props
 */
interface InteractiveGridDemoProps {
  t: (key: string) => string;
  dir: string;
}

/**
 * Combo visualizer tier
 */
interface ComboTier {
  level: string;
  multiplier: string;
  color: string;
  bonus: string;
}

/**
 * XP breakdown item
 */
interface XpBreakdownItem {
  key: string;
  icon: IconType;
  value: number;
  color: string;
}

/**
 * Level title
 */
interface LevelTitle {
  level: number;
  name: string;
  icon: string;
}

/**
 * Achievement tier
 */
interface AchievementTier {
  name: string;
  icon: string;
  count: number;
  color: string;
}

/**
 * Sample achievement
 */
interface SampleAchievement {
  name: string;
  desc: string;
  icon: string;
}

/**
 * Step configuration
 */
interface Step {
  id: string;
  icon: IconType;
  title: string;
  color: string;
}

/**
 * Step item for basics section
 */
interface StepItem {
  icon: IconType;
  title: string;
  desc: string;
}

// Interactive Mini Grid Demo Component - Auto-plays words with combo demonstration
const InteractiveGridDemo: React.FC<InteractiveGridDemoProps> = ({ t, dir }) => {
  const demoGrid = [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E']
  ];

  // Demo sequence: words to show with combo building
  const demoSequence: DemoWord[] = [
    { word: 'CAT', path: [[0,0], [0,1], [0,2]], points: 2 },
    { word: 'RAT', path: [[1,1], [0,1], [0,2]], points: 2 },
    { word: 'ART', path: [[0,1], [1,1], [0,2]], points: 2 },
    { word: 'CARS', path: [[0,0], [0,1], [1,1], [1,2]], points: 3 },
  ];

  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const currentDemo = demoSequence[currentWordIndex] ?? demoSequence[0] ?? { word: '', path: [], points: 0 };

  // Calculate combo multiplier
  const getComboMultiplier = (combo: number): number => {
    if (combo <= 2) return 1;
    if (combo <= 4) return 1.25;
    if (combo <= 6) return 1.5;
    return 1.75;
  };

  const animateWord = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setShowSuccess(false);
    const currentWord = demoSequence[currentWordIndex];
    if (!currentWord) return;

    // Animate path step by step
    currentWord.path.forEach((cell, index) => {
      setTimeout(() => {
        setSelectedCells(prev => [...prev, cell]);
      }, index * 300);
    });

    // Show success and combo
    setTimeout(() => {
      setShowSuccess(true);
      const multiplier = getComboMultiplier(comboCount + 1);
      const points = Math.floor(currentWord.points * multiplier);
      setTotalScore(prev => prev + points);
      setComboCount(prev => prev + 1);

      setTimeout(() => {
        setSelectedCells([]);
        setShowSuccess(false);
        setIsAnimating(false);
        setCurrentWordIndex((prev) => (prev + 1) % demoSequence.length);

        // Reset combo and score after full cycle
        if (currentWordIndex === demoSequence.length - 1) {
          setTimeout(() => {
            setComboCount(0);
            setTotalScore(0);
          }, 500);
        }
      }, 1200);
    }, currentWord.path.length * 300 + 400);
  }, [currentWordIndex, isAnimating, comboCount]);

  // Auto-play animation
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(animateWord, 800);
    return () => clearTimeout(timer);
  }, [animateWord, autoPlay, currentWordIndex]);

  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCells.some(([r, c]) => r === row && c === col);
  };

  const getCellIndex = (row: number, col: number): number => {
    return selectedCells.findIndex(([r, c]) => r === row && c === col);
  };

  const handleReplay = (): void => {
    setSelectedCells([]);
    setCurrentWordIndex(0);
    setComboCount(0);
    setTotalScore(0);
    setShowSuccess(false);
    setIsAnimating(false);
    setAutoPlay(true);
  };

  return (
    <div className="flex flex-col items-center gap-2 sm:gap-3">
      {/* Combo & Score Display */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {comboCount > 0 && (
          <motion.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1"
          >
            <FaFire className={`${comboCount >= 3 ? 'text-neo-orange animate-pulse' : 'text-gray-400'}`} />
            <Badge className={`${comboCount >= 3 ? 'bg-neo-orange' : 'bg-gray-300'} text-neo-black border-2 border-neo-black font-bold text-xs`}>
              {comboCount}x Combo {comboCount >= 3 && `(${getComboMultiplier(comboCount)}×)`}
            </Badge>
          </motion.div>
        )}
        {totalScore > 0 && (
          <motion.div
            key={totalScore}
            initial={{ scale: 1.2 }}
            animate={{ scale: 1 }}
          >
            <Badge className="bg-neo-yellow text-neo-black border-2 border-neo-black font-bold text-xs">
              {t('results.points')}: {totalScore}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Demo Grid */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-2 sm:p-3 bg-neo-black/10 rounded-neo border-2 sm:border-3 border-neo-black">
          {demoGrid.map((row, rowIndex) => (
            row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const cellIndex = getCellIndex(rowIndex, colIndex);

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-11 h-11 sm:w-13 sm:h-13 flex items-center justify-center relative
                    text-lg sm:text-xl font-black uppercase
                    rounded-neo border-2 sm:border-3 border-neo-black
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-neo-yellow text-neo-black shadow-hard scale-110 z-10'
                      : 'bg-neo-cream text-neo-black shadow-hard-sm'
                    }
                  `}
                  animate={isSelected ? {
                    scale: [1, 1.15, 1.1],
                  } : { scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {letter}
                  {isSelected && cellIndex >= 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-neo-pink text-neo-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center border-2 border-neo-black"
                    >
                      {cellIndex + 1}
                    </motion.span>
                  )}
                </motion.div>
              );
            })
          ))}
        </div>

        {/* Connection Lines SVG Overlay */}
        {selectedCells.length > 1 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ margin: '8px' }}>
            {selectedCells.slice(1).map((cell, i) => {
              const prev = selectedCells[i];
              if (!prev) return null;
              const prevCol = prev[1];
              const prevRow = prev[0];
              const cellCol = cell[1];
              const cellRow = cell[0];
              if (prevCol === undefined || prevRow === undefined || cellCol === undefined || cellRow === undefined) return null;
              const cellSize = 52;
              const gap = 6;
              const x1 = prevCol * (cellSize + gap) + cellSize / 2;
              const y1 = prevRow * (cellSize + gap) + cellSize / 2;
              const x2 = cellCol * (cellSize + gap) + cellSize / 2;
              const y2 = cellRow * (cellSize + gap) + cellSize / 2;

              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF6B9D"
                  strokeWidth="3"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.2 }}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Current Word Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${currentWordIndex}-${showSuccess}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className="h-8 sm:h-10 flex items-center justify-center"
        >
          <div className="flex items-center gap-2">
            <span className={`text-lg sm:text-xl font-black tracking-wider ${
              showSuccess ? 'text-neo-lime' : 'text-neo-black'
            }`}>
              {selectedCells.length > 0
                ? currentDemo.word.slice(0, selectedCells.length)
                : '...'
              }
            </span>
            {showSuccess && (
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="flex items-center gap-1"
              >
                <FaCheck className="text-neo-lime text-lg" />
                <Badge className="bg-neo-lime text-neo-black border-2 border-neo-black font-bold text-xs">
                  +{Math.floor(currentDemo.points * getComboMultiplier(comboCount))}
                </Badge>
              </motion.div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Instructions & Controls */}
      <div className="flex items-center gap-2">
        <p className="text-[10px] sm:text-xs text-neo-black/60 font-medium">
          {t('howToPlay.demo.watchAnimation')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          className="bg-neo-cream text-[10px] sm:text-xs px-2 py-1"
        >
          <FaRedo className="mr-1 text-[10px]" />
          {t('howToPlay.demo.replay') || 'Replay'}
        </Button>
      </div>
    </div>
  );
};

/**
 * Combo System Visualizer Props
 */
interface ComboVisualizerProps {
  t: (key: string) => string;
}

// Combo System Visualizer
const ComboVisualizer: React.FC<ComboVisualizerProps> = ({ t }) => {
  const [comboLevel, setComboLevel] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const comboTiers: ComboTier[] = [
    { level: '0', multiplier: '1.0x', color: 'bg-gray-400', bonus: t('howToPlay.combo.noBonus') },
    { level: '1-2', multiplier: '+1-2', color: 'bg-neo-cyan', bonus: '+1-2' },
    { level: '3-4', multiplier: '+3-4', color: 'bg-neo-lime', bonus: '+3-4' },
    { level: '5-6', multiplier: '+5-6', color: 'bg-neo-yellow', bonus: '+5-6' },
    { level: '7-8', multiplier: '+7-8', color: 'bg-neo-orange', bonus: '+7-8' },
    { level: '9+', multiplier: '+10', color: 'bg-neo-pink', bonus: '+10 max' },
  ];

  const simulateCombo = (): void => {
    if (isAnimating) return;
    setIsAnimating(true);
    setComboLevel(0);

    // Simulate rapid word submissions
    let level = 0;
    const interval = setInterval(() => {
      level++;
      setComboLevel(level);
      if (level >= 12) {
        clearInterval(interval);
        setTimeout(() => {
          setIsAnimating(false);
        }, 2000);
      }
    }, 400);
  };

  const getCurrentTier = (): number => {
    if (comboLevel <= 0) return 0;
    if (comboLevel <= 2) return 1;
    if (comboLevel <= 4) return 2;
    if (comboLevel <= 6) return 3;
    if (comboLevel <= 8) return 4;
    return 5;
  };

  const getCurrentTierData = (): ComboTier => {
    return comboTiers[getCurrentTier()] ?? comboTiers[0] ?? { level: '0', multiplier: '1.0x', color: 'bg-gray-400', bonus: '' };
  };

  return (
    <div className="space-y-4">
      {/* Combo Meter */}
      <div className="relative bg-neo-cream rounded-neo border-3 border-neo-black p-4 shadow-hard-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-neo-black flex items-center gap-2">
            <FaFire className={comboLevel > 2 ? 'text-neo-orange animate-pulse' : 'text-gray-400'} />
            {t('howToPlay.combo.currentCombo')}
          </span>
          <motion.span
            key={comboLevel}
            initial={{ scale: 1.5 }}
            animate={{ scale: 1 }}
            className="text-2xl font-black text-neo-black"
          >
            {comboLevel}x
          </motion.span>
        </div>

        <div className="h-4 bg-neo-black/10 rounded-neo-pill border-2 border-neo-black overflow-hidden">
          <motion.div
            className={`h-full ${getCurrentTierData().color}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(comboLevel * 8.3, 100)}%` }}
            transition={{ type: 'spring', stiffness: 100 }}
          />
        </div>

        {comboLevel > 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-center"
          >
            <Badge className={`${getCurrentTierData().color} text-neo-black border-2 border-neo-black font-bold`}>
              {getCurrentTierData().multiplier} {t('howToPlay.combo.multiplier')}
            </Badge>
          </motion.div>
        )}
      </div>

      {/* Combo Tiers Reference */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {comboTiers.map((tier, index) => (
          <div
            key={index}
            className={`
              p-2 rounded-neo border-2 border-neo-black text-center text-sm
              ${getCurrentTier() === index ? 'ring-2 ring-neo-pink ring-offset-2' : ''}
              ${tier.color}
            `}
          >
            <div className="font-bold text-neo-black">{tier.level}</div>
            <div className="text-xs font-semibold text-neo-black/80">{tier.multiplier}</div>
          </div>
        ))}
      </div>

      {/* Try It Button */}
      <Button
        variant="outline"
        onClick={simulateCombo}
        disabled={isAnimating}
        className="w-full bg-neo-yellow hover:bg-neo-orange"
      >
        <FaBolt className="mr-2" />
        {isAnimating ? t('howToPlay.combo.building') : t('howToPlay.combo.tryIt')}
      </Button>

      <p className="text-sm text-neo-black/60 text-center">
        {t('howToPlay.combo.tip')}
      </p>
    </div>
  );
};

/**
 * XP Explainer Props
 */
interface XpExplainerProps {
  t: (key: string) => string;
}

// XP & Level System Explainer
const XpExplainer: React.FC<XpExplainerProps> = ({ t }) => {
  const xpBreakdown: XpBreakdownItem[] = [
    { key: 'base', icon: FaGamepad, value: 50, color: 'bg-neo-cyan' },
    { key: 'score', icon: FaStar, value: 25, color: 'bg-neo-yellow' },
    { key: 'win', icon: FaTrophy, value: 100, color: 'bg-neo-lime' },
    { key: 'achievement', icon: FaMedal, value: 30, color: 'bg-neo-pink' },
  ];

  const titles: LevelTitle[] = [
    { level: 1, name: t('xp.titles.wordSeeker'), icon: '📖' },
    { level: 5, name: t('xp.titles.letterHunter'), icon: '🔍' },
    { level: 10, name: t('xp.titles.vocabularian'), icon: '📚' },
    { level: 15, name: t('xp.titles.wordsmith'), icon: '✍️' },
    { level: 20, name: t('xp.titles.lexiconAdept'), icon: '🎓' },
    { level: 30, name: t('xp.titles.linguisticLegend'), icon: '👑' },
  ];

  return (
    <div className="space-y-4">
      {/* XP Sources */}
      <div className="bg-neo-cream rounded-neo border-3 border-neo-black p-4 shadow-hard-sm">
        <h4 className="font-bold text-neo-black mb-3 flex items-center gap-2">
          <FaLevelUpAlt className="text-neo-pink" />
          {t('howToPlay.xp.howToEarn')}
        </h4>

        <div className="space-y-2">
          {xpBreakdown.map((item, index) => (
            <motion.div
              key={item.key}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-between p-2 rounded-neo bg-neo-white border-2 border-neo-black"
            >
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-neo ${item.color} flex items-center justify-center border-2 border-neo-black`}>
                  <item.icon className="text-neo-black" />
                </div>
                <span className="font-medium text-neo-black">
                  {t(`howToPlay.xp.${item.key}`)}
                </span>
              </div>
              <Badge className={`${item.color} text-neo-black border-2 border-neo-black font-bold`}>
                +{item.value} XP
              </Badge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Level Titles */}
      <div className="bg-gradient-to-br from-neo-pink/20 to-neo-yellow/20 rounded-neo border-3 border-neo-black p-4">
        <h4 className="font-bold text-neo-black mb-3">
          {t('howToPlay.xp.unlockTitles')}
        </h4>
        <div className="grid grid-cols-2 gap-2">
          {titles.map((title) => (
            <div key={title.level} className="flex items-center gap-2 text-sm">
              <span className="text-lg">{title.icon}</span>
              <div>
                <div className="font-semibold text-neo-black">{title.name}</div>
                <div className="text-xs text-neo-black/60">{t('xp.level')} {title.level}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Achievement Tiers Props
 */
interface AchievementTiersProps {
  t: (key: string) => string;
}

// Achievement Tiers Explainer
const AchievementTiers: React.FC<AchievementTiersProps> = ({ t }) => {
  const tiers: AchievementTier[] = [
    { name: t('achievementTiers.bronze'), icon: '🥉', count: 1, color: 'bg-amber-600' },
    { name: t('achievementTiers.silver'), icon: '🥈', count: 15, color: 'bg-gray-400' },
    { name: t('achievementTiers.gold'), icon: '🥇', count: 75, color: 'bg-yellow-500' },
    { name: t('achievementTiers.platinum'), icon: '💎', count: 300, color: 'bg-cyan-400' },
  ];

  const sampleAchievements: SampleAchievement[] = [
    { name: t('achievements.FIRST_BLOOD.name'), desc: t('achievements.FIRST_BLOOD.description'), icon: '⚡' },
    { name: t('achievements.WORD_MASTER.name'), desc: t('achievements.WORD_MASTER.description'), icon: '📏' },
    { name: t('achievements.COMBO_KING.name'), desc: t('achievements.COMBO_KING.description'), icon: '🔥' },
    { name: t('achievements.SPEED_DEMON.name'), desc: t('achievements.SPEED_DEMON.description'), icon: '💨' },
  ];

  return (
    <div className="space-y-4">
      {/* Tier Progression */}
      <div className="flex justify-between items-center gap-1 sm:gap-2">
        {tiers.map((tier, index) => (
          <React.Fragment key={tier.name}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex flex-col items-center"
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-neo ${tier.color} flex items-center justify-center text-2xl border-3 border-neo-black shadow-hard-sm`}>
                {tier.icon}
              </div>
              <span className="text-xs font-bold mt-1 text-neo-black">{tier.name}</span>
              <span className="text-xs text-neo-black/60">×{tier.count}</span>
            </motion.div>
            {index < tiers.length - 1 && (
              <FaChevronRight className="text-neo-black/40 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Sample Achievements */}
      <div className="space-y-2">
        <h4 className="font-bold text-neo-black text-sm">
          {t('howToPlay.achievements.examples')}
        </h4>
        {sampleAchievements.map((ach, index) => (
          <motion.div
            key={index}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center gap-3 p-2 bg-neo-cream rounded-neo border-2 border-neo-black"
          >
            <span className="text-2xl">{ach.icon}</span>
            <div>
              <div className="font-semibold text-neo-black text-sm">{ach.name}</div>
              <div className="text-xs text-neo-black/60">{ach.desc}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/**
 * HowToPlay Props
 */
interface HowToPlayProps {
  onClose: () => void;
}

// Main HowToPlay Component
const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  const { t, dir } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  // Simplified to 3 main steps for clearer onboarding
  const steps: Step[] = useMemo(() => [
    {
      id: 'basics',
      icon: FaGamepad,
      title: t('howToPlay.steps.basics.title'),
      color: 'bg-neo-cyan'
    },
    {
      id: 'grid',
      icon: FaHandPointer,
      title: t('howToPlay.steps.grid.title'),
      color: 'bg-neo-yellow'
    },
    {
      id: 'scoring',
      icon: FaStar,
      title: t('howToPlay.steps.scoring.title'),
      color: 'bg-neo-lime'
    },
  ], [t]);

  const nextStep = (): void => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = (): void => setCurrentStep((prev) => Math.max(prev - 1, 0));
  const isRTL = dir === 'rtl';
  const activeStep = steps[currentStep] ?? steps[0];

  const renderStepContent = (): React.ReactNode => {
    const step = steps[currentStep];
    if (!step) return null;
    switch (step.id) {
      case 'basics':
        return (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-neo-black leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.basics.description')}
            </p>

            <div className="space-y-2 sm:space-y-3">
              {([
                { icon: FaUsers, title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
                { icon: FaClock, title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
                { icon: FaTrophy, title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
              ] as StepItem[]).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-2 sm:gap-3 items-start"
                >
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-neo-yellow rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                    <item.icon className="text-neo-black text-sm sm:text-base" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-neo-black text-sm sm:text-base">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-neo-black/70">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-neo-black leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.grid.description')}
            </p>

            {/* Interactive Demo - Main focus! */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-neo-cyan/20 to-neo-pink/20 rounded-neo border-2 border-neo-black p-3 sm:p-4"
            >
              <InteractiveGridDemo t={t} dir={dir} />
            </motion.div>

            <div className="bg-neo-yellow/30 rounded-neo border-2 border-neo-black p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-medium text-neo-black flex items-center gap-2">
                <FaLightbulb className="text-neo-orange flex-shrink-0" />
                {t('howToPlay.findWordsNote')}
              </p>
            </div>
          </div>
        );

      case 'scoring':
        return (
          <div className="space-y-3 sm:space-y-4">
            <p className="text-neo-black leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.scoring.description')}
            </p>

            {/* Simplified Scoring - Just show the formula and a few examples */}
            <div className="bg-neo-cream rounded-neo border-2 sm:border-3 border-neo-black p-3 sm:p-4 text-center shadow-hard">
              <p className="font-black text-neo-black text-base sm:text-lg mb-2">
                {t('howToPlay.scoringTable.formula')}
              </p>
              <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                {[
                  { letters: '3', points: 2 },
                  { letters: '5', points: 4 },
                  { letters: '7+', points: '6+' },
                ].map((item, index) => (
                  <div key={index} className="bg-neo-yellow rounded-neo border-2 border-neo-black px-3 py-1 sm:px-4 sm:py-2">
                    <span className="font-bold text-neo-black text-sm sm:text-base">
                      {item.letters} {t('howToPlay.letters')} = {item.points} {t('howToPlay.pts')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus features mention */}
            <div className="bg-neo-lime/30 rounded-neo border-2 border-neo-black p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-medium text-neo-black flex items-center gap-2">
                <FaFire className="text-neo-orange flex-shrink-0" />
                {t('howToPlay.steps.combo.description') || 'Find words quickly for combo bonuses!'}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto px-3 sm:px-4 pb-4"
      dir={dir}
    >
      {/* Progress Indicator - Scrollable on mobile */}
      <div className="mb-3 sm:mb-4">
        <div className="flex justify-between gap-1 sm:gap-2 mb-2 overflow-x-auto pb-1">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`
                w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 rounded-neo border-2 border-neo-black flex items-center justify-center
                transition-all duration-200 shadow-hard-sm
                ${index === currentStep
                  ? `${step.color} scale-105 sm:scale-110 shadow-hard`
                  : index < currentStep
                    ? 'bg-neo-lime'
                    : 'bg-neo-cream'
                }
              `}
            >
              {index < currentStep ? (
                <FaCheck className="text-neo-black text-xs sm:text-sm" />
              ) : (
                <step.icon className="text-neo-black text-xs sm:text-sm" />
              )}
            </button>
          ))}
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} variant="accent" />
      </div>

      {/* Step Title */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${activeStep?.color ?? 'bg-neo-cyan'} rounded-neo border-2 sm:border-3 border-neo-black p-3 sm:p-4 mb-3 sm:mb-4 shadow-hard`}
      >
        <h3 className="text-base sm:text-xl font-black text-neo-black flex items-center gap-2">
          {activeStep && React.createElement(activeStep.icon, { className: 'text-sm sm:text-base' })}
          {activeStep?.title}
        </h3>
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: isRTL ? -50 : 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isRTL ? 50 : -50 }}
          transition={{ duration: 0.2 }}
          className="min-h-[200px] sm:min-h-[300px]"
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation - Fixed at bottom on mobile */}
      <div className="flex justify-between items-center mt-4 sm:mt-6 pt-3 sm:pt-4 border-t-2 border-neo-black/20 gap-2">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="bg-neo-cream text-sm sm:text-base px-2 sm:px-4"
        >
          <FaChevronLeft className={`${isRTL ? 'ml-1 sm:ml-2 rotate-180' : 'mr-1 sm:mr-2'}`} />
          <span className="hidden xs:inline">{t('common.back')}</span>
        </Button>

        <span className="text-xs sm:text-sm font-bold text-neo-black/60 flex-shrink-0">
          {currentStep + 1} / {steps.length}
        </span>

        {currentStep === steps.length - 1 ? (
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-neo-lime text-sm sm:text-base px-2 sm:px-4"
          >
            <span className="hidden xs:inline">{t('common.understood')}</span>
            <span className="xs:hidden">OK</span>
            <FaCheck className={`${isRTL ? 'mr-1 sm:mr-2' : 'ml-1 sm:ml-2'}`} />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={nextStep}
            className="bg-neo-yellow text-sm sm:text-base px-2 sm:px-4"
          >
            <span className="hidden xs:inline">{t('common.next') || 'Next'}</span>
            <span className="xs:hidden">{t('common.next') || 'Next'}</span>
            <FaChevronRight className={`${isRTL ? 'mr-1 sm:mr-2 rotate-180' : 'ml-1 sm:ml-2'}`} />
          </Button>
        )}
      </div>

      {/* Quick Tips - Only show on last step */}
      {currentStep === steps.length - 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 bg-neo-pink/20 rounded-neo border-2 border-neo-black p-3"
        >
          <h4 className="font-bold text-neo-black mb-2 flex items-center gap-2 text-sm">
            <FaLightbulb className="text-neo-yellow" />
            {t('howToPlay.tipsTitle')}
          </h4>
          <ul className="space-y-1 text-xs text-neo-black">
            {[1, 2, 4].map((num) => (
              <li key={num} className="flex items-start gap-2">
                <FaCheck className="text-neo-lime mt-0.5 flex-shrink-0 text-xs" />
                <span>{t(`howToPlay.tips.tip${num}`)}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}
    </motion.div>
  );
};

export default HowToPlay;
