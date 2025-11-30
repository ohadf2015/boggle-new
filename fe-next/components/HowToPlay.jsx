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

// Interactive Mini Grid Demo Component
const InteractiveGridDemo = ({ t, dir }) => {
  const demoGrid = [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E']
  ];

  const demoWords = [
    { word: 'CAT', path: [[0,0], [0,1], [0,2]], points: 2 },
    { word: 'CARS', path: [[0,0], [0,1], [1,1], [1,2]], points: 3 },
    { word: 'SWORD', path: [[1,2], [2,0], [1,0], [1,1], [2,1]], points: 4 },
  ];

  const [selectedCells, setSelectedCells] = useState([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const animateWord = useCallback(() => {
    if (isAnimating) return;

    setIsAnimating(true);
    setShowSuccess(false);
    const currentWord = demoWords[currentWordIndex];

    // Animate path step by step
    currentWord.path.forEach((cell, index) => {
      setTimeout(() => {
        setSelectedCells(prev => [...prev, cell]);
      }, index * 400);
    });

    // Show success and reset
    setTimeout(() => {
      setShowSuccess(true);
      setTimeout(() => {
        setSelectedCells([]);
        setShowSuccess(false);
        setIsAnimating(false);
        setCurrentWordIndex((prev) => (prev + 1) % demoWords.length);
      }, 1500);
    }, currentWord.path.length * 400 + 500);
  }, [currentWordIndex, isAnimating]);

  // Auto-play animation
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(animateWord, 1000);
    return () => clearTimeout(timer);
  }, [animateWord, autoPlay, currentWordIndex]);

  const isCellSelected = (row, col) => {
    return selectedCells.some(([r, c]) => r === row && c === col);
  };

  const getCellIndex = (row, col) => {
    return selectedCells.findIndex(([r, c]) => r === row && c === col);
  };

  const currentWord = demoWords[currentWordIndex];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Demo Grid */}
      <div className="relative">
        <div className="grid grid-cols-3 gap-1.5 p-3 bg-neo-black/10 rounded-neo border-3 border-neo-black">
          {demoGrid.map((row, rowIndex) => (
            row.map((letter, colIndex) => {
              const isSelected = isCellSelected(rowIndex, colIndex);
              const cellIndex = getCellIndex(rowIndex, colIndex);

              return (
                <motion.div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center
                    text-xl sm:text-2xl font-black uppercase
                    rounded-neo border-3 border-neo-black
                    transition-all duration-200
                    ${isSelected
                      ? 'bg-neo-yellow text-neo-black shadow-hard scale-110 z-10'
                      : 'bg-neo-cream text-neo-black shadow-hard-sm'
                    }
                  `}
                  animate={isSelected ? {
                    scale: [1, 1.1, 1.05],
                    rotate: [0, -2, 2, 0]
                  } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {letter}
                  {isSelected && cellIndex >= 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-neo-pink text-neo-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-neo-black">
                      {cellIndex + 1}
                    </span>
                  )}
                </motion.div>
              );
            })
          ))}
        </div>

        {/* Connection Lines SVG Overlay */}
        {selectedCells.length > 1 && (
          <svg className="absolute inset-0 pointer-events-none" style={{ margin: '12px' }}>
            {selectedCells.slice(1).map((cell, i) => {
              const prev = selectedCells[i];
              const cellSize = 56;
              const gap = 6;
              const x1 = prev[1] * (cellSize + gap) + cellSize / 2;
              const y1 = prev[0] * (cellSize + gap) + cellSize / 2;
              const x2 = cell[1] * (cellSize + gap) + cellSize / 2;
              const y2 = cell[0] * (cellSize + gap) + cellSize / 2;

              return (
                <motion.line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#FF6B9D"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.3 }}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* Current Word Display */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentWordIndex}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl font-black text-neo-black tracking-wider">
              {selectedCells.length > 0
                ? currentWord.word.slice(0, selectedCells.length)
                : '...'
              }
            </span>
            {showSuccess && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1"
              >
                <FaCheck className="text-neo-lime text-xl" />
                <Badge className="bg-neo-lime text-neo-black border-2 border-neo-black font-bold">
                  +{currentWord.points} {t('results.points')}
                </Badge>
              </motion.div>
            )}
          </div>
          <p className="text-sm text-neo-black/60 font-medium">
            {t('howToPlay.demo.watchAnimation')}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          variant="neo"
          size="sm"
          onClick={() => setAutoPlay(!autoPlay)}
          className={autoPlay ? 'bg-neo-lime' : 'bg-neo-cream'}
        >
          {autoPlay ? <FaPlay className="mr-1" /> : <FaRedo className="mr-1" />}
          {autoPlay ? t('howToPlay.demo.autoPlay') : t('howToPlay.demo.replay')}
        </Button>
      </div>
    </div>
  );
};

// Combo System Visualizer
const ComboVisualizer = ({ t }) => {
  const [comboLevel, setComboLevel] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const comboTiers = [
    { level: '0-2', multiplier: '1.0x', color: 'bg-gray-400', bonus: t('howToPlay.combo.noBonus') },
    { level: '3-4', multiplier: '1.25x', color: 'bg-neo-cyan', bonus: '+25%' },
    { level: '5-6', multiplier: '1.5x', color: 'bg-neo-lime', bonus: '+50%' },
    { level: '7-8', multiplier: '1.75x', color: 'bg-neo-yellow', bonus: '+75%' },
    { level: '9-10', multiplier: '2.0x', color: 'bg-neo-orange', bonus: '+100%' },
    { level: '11+', multiplier: '2.25x', color: 'bg-neo-pink', bonus: '+125%' },
  ];

  const simulateCombo = () => {
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

  const getCurrentTier = () => {
    if (comboLevel <= 2) return 0;
    if (comboLevel <= 4) return 1;
    if (comboLevel <= 6) return 2;
    if (comboLevel <= 8) return 3;
    if (comboLevel <= 10) return 4;
    return 5;
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
            className={`h-full ${comboTiers[getCurrentTier()].color}`}
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
            <Badge className={`${comboTiers[getCurrentTier()].color} text-neo-black border-2 border-neo-black font-bold`}>
              {comboTiers[getCurrentTier()].multiplier} {t('howToPlay.combo.multiplier')}
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
        variant="neo"
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

// XP & Level System Explainer
const XpExplainer = ({ t }) => {
  const xpBreakdown = [
    { key: 'base', icon: FaGamepad, value: 50, color: 'bg-neo-cyan' },
    { key: 'score', icon: FaStar, value: 25, color: 'bg-neo-yellow' },
    { key: 'win', icon: FaTrophy, value: 100, color: 'bg-neo-lime' },
    { key: 'achievement', icon: FaMedal, value: 30, color: 'bg-neo-pink' },
  ];

  const titles = [
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

// Achievement Tiers Explainer
const AchievementTiers = ({ t }) => {
  const tiers = [
    { name: t('achievementTiers.bronze'), icon: '🥉', count: 1, color: 'bg-amber-600' },
    { name: t('achievementTiers.silver'), icon: '🥈', count: 15, color: 'bg-gray-400' },
    { name: t('achievementTiers.gold'), icon: '🥇', count: 75, color: 'bg-yellow-500' },
    { name: t('achievementTiers.platinum'), icon: '💎', count: 300, color: 'bg-cyan-400' },
  ];

  const sampleAchievements = [
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

// Main HowToPlay Component
const HowToPlay = ({ onClose }) => {
  const { t, dir } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = useMemo(() => [
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
    {
      id: 'combo',
      icon: FaFire,
      title: t('howToPlay.steps.combo.title'),
      color: 'bg-neo-orange'
    },
    {
      id: 'xp',
      icon: FaLevelUpAlt,
      title: t('howToPlay.steps.xp.title'),
      color: 'bg-neo-pink'
    },
    {
      id: 'achievements',
      icon: FaTrophy,
      title: t('howToPlay.steps.achievements.title'),
      color: 'bg-neo-purple'
    },
  ], [t]);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 0));

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'basics':
        return (
          <div className="space-y-4">
            <p className="text-neo-black leading-relaxed">
              {t('howToPlay.steps.basics.description')}
            </p>

            <div className="space-y-3">
              {[
                { icon: FaUsers, title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
                { icon: FaClock, title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
                { icon: FaStar, title: t('howToPlay.findWordsTitle'), desc: t('howToPlay.findWordsDesc') },
                { icon: FaTrophy, title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 items-start"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-neo-yellow rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                    <item.icon className="text-neo-black" />
                  </div>
                  <div>
                    <h4 className="font-bold text-neo-black">{item.title}</h4>
                    <p className="text-sm text-neo-black/70">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-4">
            <p className="text-neo-black leading-relaxed">
              {t('howToPlay.steps.grid.description')}
            </p>

            {/* Tutorial Image - Shows real game example */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative rounded-neo border-3 border-neo-black overflow-hidden shadow-hard"
            >
              <img
                src="/how-to/image-1764521954444-678.jpg"
                alt={t('howToPlay.demo.gridExample') || 'Example of tracing a word on the grid'}
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neo-black/80 to-transparent p-3">
                <p className="text-neo-white text-sm font-bold text-center">
                  {t('howToPlay.demo.traceExample') || 'Trace letters to form words - T→O→N→D'}
                </p>
              </div>
            </motion.div>

            <InteractiveGridDemo t={t} dir={dir} />
            <div className="bg-neo-yellow/30 rounded-neo border-2 border-neo-black p-3">
              <p className="text-sm font-medium text-neo-black flex items-center gap-2">
                <FaLightbulb className="text-neo-orange" />
                {t('howToPlay.findWordsNote')}
              </p>
            </div>
          </div>
        );

      case 'scoring':
        return (
          <div className="space-y-4">
            <p className="text-neo-black leading-relaxed">
              {t('howToPlay.steps.scoring.description')}
            </p>

            {/* Scoring Table */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { letters: '2', points: 1, color: 'bg-gray-400' },
                { letters: '3', points: 2, color: 'bg-neo-cyan' },
                { letters: '4', points: 3, color: 'bg-neo-lime' },
                { letters: '5', points: 4, color: 'bg-neo-yellow' },
                { letters: '6', points: 5, color: 'bg-neo-orange' },
                { letters: '7', points: 6, color: 'bg-neo-pink' },
                { letters: '8+', points: '7+', color: 'bg-neo-purple' },
              ].map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${item.color} p-3 rounded-neo border-2 border-neo-black text-center shadow-hard-sm`}
                >
                  <div className="text-lg font-black text-neo-black">{item.letters}</div>
                  <div className="text-xs font-bold text-neo-black/80">{t('howToPlay.letters')}</div>
                  <div className="text-sm font-bold text-neo-black mt-1">= {item.points} {t('howToPlay.pts')}</div>
                </motion.div>
              ))}
            </div>

            <div className="bg-neo-cream rounded-neo border-2 border-neo-black p-3 text-center">
              <p className="font-bold text-neo-black">
                {t('howToPlay.scoringTable.formula')}
              </p>
            </div>

            <div className="bg-neo-red/20 rounded-neo border-2 border-neo-black p-3">
              <p className="text-sm font-medium text-neo-black flex items-center gap-2">
                <FaTimes className="text-neo-red" />
                {t('common.duplicateWarning')}
              </p>
            </div>
          </div>
        );

      case 'combo':
        return (
          <div className="space-y-4">
            <p className="text-neo-black leading-relaxed">
              {t('howToPlay.steps.combo.description')}
            </p>
            <ComboVisualizer t={t} />
          </div>
        );

      case 'xp':
        return (
          <div className="space-y-4">
            <p className="text-neo-black leading-relaxed">
              {t('howToPlay.steps.xp.description')}
            </p>
            <XpExplainer t={t} />
          </div>
        );

      case 'achievements':
        return (
          <div className="space-y-4">
            <p className="text-neo-black leading-relaxed">
              {t('howToPlay.steps.achievements.description')}
            </p>
            <AchievementTiers t={t} />
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
      className="w-full max-w-2xl mx-auto"
      dir={dir}
    >
      {/* Progress Indicator */}
      <div className="mb-4">
        <div className="flex justify-between mb-2">
          {steps.map((step, index) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(index)}
              className={`
                w-10 h-10 rounded-neo border-2 border-neo-black flex items-center justify-center
                transition-all duration-200 shadow-hard-sm
                ${index === currentStep
                  ? `${step.color} scale-110 shadow-hard`
                  : index < currentStep
                    ? 'bg-neo-lime'
                    : 'bg-neo-cream'
                }
              `}
            >
              {index < currentStep ? (
                <FaCheck className="text-neo-black" />
              ) : (
                <step.icon className="text-neo-black" />
              )}
            </button>
          ))}
        </div>
        <Progress value={(currentStep / (steps.length - 1)) * 100} variant="accent" />
      </div>

      {/* Step Title */}
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className={`${steps[currentStep].color} rounded-neo border-3 border-neo-black p-4 mb-4 shadow-hard`}
      >
        <h3 className="text-xl font-black text-neo-black flex items-center gap-2">
          {React.createElement(steps[currentStep].icon)}
          {steps[currentStep].title}
        </h3>
      </motion.div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.2 }}
          className="min-h-[300px]"
        >
          {renderStepContent()}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-6 pt-4 border-t-2 border-neo-black/20">
        <Button
          variant="neo"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="bg-neo-cream"
        >
          <FaChevronLeft className="mr-2" />
          {t('common.back')}
        </Button>

        <span className="text-sm font-bold text-neo-black/60">
          {currentStep + 1} / {steps.length}
        </span>

        {currentStep === steps.length - 1 ? (
          <Button
            variant="neo"
            onClick={onClose}
            className="bg-neo-lime"
          >
            {t('common.understood')}
            <FaCheck className="ml-2" />
          </Button>
        ) : (
          <Button
            variant="neo"
            onClick={nextStep}
            className="bg-neo-yellow"
          >
            {t('common.next') || 'Next'}
            <FaChevronRight className="ml-2" />
          </Button>
        )}
      </div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 bg-neo-lime/20 rounded-neo border-2 border-neo-black p-4"
      >
        <h4 className="font-bold text-neo-black mb-2 flex items-center gap-2">
          <FaLightbulb className="text-neo-yellow" />
          {t('howToPlay.tipsTitle')}
        </h4>
        <ul className="space-y-1 text-sm text-neo-black">
          {[1, 2, 3, 4, 5].map((num) => (
            <li key={num} className="flex items-start gap-2">
              <FaCheck className="text-neo-lime mt-0.5 flex-shrink-0" />
              <span>{t(`howToPlay.tips.tip${num}`)}</span>
            </li>
          ))}
        </ul>
      </motion.div>
    </motion.div>
  );
};

export default HowToPlay;
