'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gamepad2, Users, Trophy, Clock, Star, Flame,
  ChevronRight, ChevronLeft, RotateCw, Lightbulb,
  Check, Pointer
} from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { useLanguage } from '../contexts/LanguageContext';
import type { LucideIcon } from 'lucide-react';

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
 * Step configuration
 */
interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  color: string;
}

/**
 * Step item for basics section
 */
interface StepItem {
  icon: LucideIcon;
  title: string;
  desc: string;
}

// Interactive Mini Grid Demo Component - Auto-plays words with combo demonstration
const InteractiveGridDemo: React.FC<InteractiveGridDemoProps> = ({ t, dir }) => {
  // Memoize demo data to prevent recreation on every render
  const demoGrid = useMemo(() => [
    ['C', 'A', 'T'],
    ['O', 'R', 'S'],
    ['W', 'D', 'E']
  ], []);

  // Demo sequence: words to show with combo building
  const demoSequence = useMemo<DemoWord[]>(() => [
    { word: 'CAT', path: [[0,0], [0,1], [0,2]], points: 2 },
    { word: 'RAT', path: [[1,1], [0,1], [0,2]], points: 2 },
    { word: 'ART', path: [[0,1], [1,1], [0,2]], points: 2 },
    { word: 'CARS', path: [[0,0], [0,1], [1,1], [1,2]], points: 3 },
  ], []);

  const [selectedCells, setSelectedCells] = useState<[number, number][]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [comboCount, setComboCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);

  const currentDemo = demoSequence[currentWordIndex] ?? demoSequence[0] ?? { word: '', path: [], points: 0 };

  // Calculate combo multiplier (memoized for stable reference)
  const getComboMultiplier = useCallback((combo: number): number => {
    if (combo <= 2) return 1;
    if (combo <= 4) return 1.25;
    if (combo <= 6) return 1.5;
    return 1.75;
  }, []);

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
  }, [currentWordIndex, isAnimating, comboCount, getComboMultiplier, demoSequence]);

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
    <div className="flex flex-col items-center gap-2 sm:gap-3 overflow-hidden">
      {/* Combo & Score Display */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {comboCount > 0 && (
          <motion.div
            key={comboCount}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1"
          >
            <Flame className={`${comboCount >= 3 ? 'text-neo-orange animate-pulse' : 'text-gray-600'}`} />
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
      <div className="relative overflow-hidden p-2">
        <div className="grid grid-cols-3 gap-1 sm:gap-1.5 p-2 sm:p-3 bg-neo-black/10 text-white rounded-neo border-2 sm:border-3 border-neo-black">
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
                      className={`absolute -top-1 ${dir === 'rtl' ? '-left-1' : '-right-1'} w-4 h-4 sm:w-5 sm:h-5 bg-neo-pink text-neo-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center border-2 border-neo-black`}
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
          <svg className="absolute inset-0 pointer-events-none z-20" style={{ margin: '8px' }}>
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
              const numCols = 3;
              const gridContentWidth = numCols * cellSize + (numCols - 1) * gap;
              const isRTL = dir === 'rtl';

              // Calculate x coordinates (flip for RTL to match CSS grid direction)
              const getX = (col: number): number => {
                const ltrX = col * (cellSize + gap) + cellSize / 2;
                return isRTL ? gridContentWidth - ltrX : ltrX;
              };

              const x1 = getX(prevCol);
              const y1 = prevRow * (cellSize + gap) + cellSize / 2;
              const x2 = getX(cellCol);
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
                <Check className="text-neo-lime text-lg" />
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
        <p className="text-[10px] sm:text-xs text-neo-black/75 font-medium">
          {t('howToPlay.demo.watchAnimation')}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={handleReplay}
          className="bg-neo-cream text-[10px] sm:text-xs px-2 py-1"
        >
          <RotateCw className="mr-1 text-[10px]" />
          {t('howToPlay.demo.replay') || 'Replay'}
        </Button>
      </div>
    </div>
  );
};

// NOTE: ComboVisualizer, XpExplainer, and AchievementTiers components
// have been moved to separate files in components/how-to-play/

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
      icon: Gamepad2,
      title: t('howToPlay.steps.basics.title'),
      color: 'bg-neo-cyan'
    },
    {
      id: 'grid',
      icon: Pointer,
      title: t('howToPlay.steps.grid.title'),
      color: 'bg-neo-yellow'
    },
    {
      id: 'scoring',
      icon: Star,
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
                { icon: Users, title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
                { icon: Clock, title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
                { icon: Trophy, title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
              ] as StepItem[]).map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-2 sm:gap-3 items-start"
                >
                  <div className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
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

            <div className="bg-neo-yellow/30 text-neo-black rounded-neo border-2 border-neo-black p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-medium text-neo-black flex items-center gap-2">
                <Lightbulb className="text-neo-orange flex-shrink-0" />
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
                  <div key={index} className="bg-neo-yellow text-neo-black rounded-neo border-2 border-neo-black px-3 py-1 sm:px-4 sm:py-2">
                    <span className="font-bold text-neo-black text-sm sm:text-base">
                      {item.letters} {t('howToPlay.letters')} = {item.points} {t('howToPlay.pts')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus features mention */}
            <div className="bg-neo-lime/30 text-neo-black rounded-neo border-2 border-neo-black p-2 sm:p-3">
              <p className="text-xs sm:text-sm font-medium text-neo-black flex items-center gap-2">
                <Flame className="text-neo-orange flex-shrink-0" />
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
                <Check className="text-neo-black text-xs sm:text-sm" />
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
          <ChevronLeft className={`${isRTL ? 'ml-1 sm:ml-2 rotate-180' : 'mr-1 sm:mr-2'}`} />
          <span className="hidden xs:inline">{t('common.back')}</span>
        </Button>

        <span className="text-xs sm:text-sm font-bold text-neo-black/75 flex-shrink-0">
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
            <Check className={`${isRTL ? 'mr-1 sm:mr-2' : 'ml-1 sm:ml-2'}`} />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={nextStep}
            className="bg-neo-yellow text-sm sm:text-base px-2 sm:px-4"
          >
            <span className="hidden xs:inline">{t('common.next') || 'Next'}</span>
            <span className="xs:hidden">{t('common.next') || 'Next'}</span>
            <ChevronRight className={`${isRTL ? 'mr-1 sm:mr-2 rotate-180' : 'ml-1 sm:ml-2'}`} />
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
            <Lightbulb className="text-neo-yellow" />
            {t('howToPlay.tipsTitle')}
          </h4>
          <ul className="space-y-1 text-xs text-neo-black">
            {[1, 2, 4].map((num) => (
              <li key={num} className="flex items-start gap-2">
                <Check className="text-neo-lime mt-0.5 flex-shrink-0 text-xs" />
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
