'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Gamepad2, Users, Trophy, Clock, Star, Flame,
  ChevronRight, ChevronLeft, Lightbulb,
  Check, Pointer,
  type LucideIcon
} from 'lucide-react';
import { Button } from './ui/button';
import { useLanguage } from '../contexts/LanguageContext';
import MiniGrid, { GridPosition } from './onboarding/MiniGrid';

interface DemoConfig {
  letters: string[][];
  path: GridPosition[];
  word: string;
}

// Language-specific demo configurations (same as onboarding)
const demoConfigs: Record<string, DemoConfig> = {
  en: {
    letters: [['C', 'A', 'P'], ['D', 'T', 'O'], ['E', 'R', 'S']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'CAT',
  },
  es: {
    letters: [['S', 'O', 'P'], ['D', 'L', 'I'], ['E', 'R', 'N']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'SOL',
  },
  sv: {
    letters: [['S', 'O', 'P'], ['D', 'L', 'I'], ['E', 'R', 'N']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'SOL',
  },
  he: {
    letters: [['ש', 'מ', 'ל'], ['ד', 'ש', 'ו'], ['ת', 'ר', 'ס']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'שמש',
  },
  ja: {
    letters: [['C', 'A', 'P'], ['D', 'T', 'O'], ['E', 'R', 'S']],
    path: [{ row: 0, col: 0 }, { row: 0, col: 1 }, { row: 1, col: 1 }],
    word: 'CAT',
  },
};

/**
 * Step configuration
 */
interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  bgColor: string;
  dotColor: string;
}

/**
 * Step item for basics section
 */
interface StepItem {
  id: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}

/**
 * HowToPlay Props
 */
interface HowToPlayProps {
  onClose: () => void;
}

// Compact Step Dot Component
const StepDot: React.FC<{
  step: Step;
  index: number;
  currentStep: number;
  onClick: () => void;
}> = ({ step, index, currentStep, onClick }) => {
  const isActive = index === currentStep;
  const isCompleted = index < currentStep;

  return (
    <button
      onClick={onClick}
      className={`
        w-3 h-3 rounded-full transition-all duration-200
        ${isActive
          ? step.dotColor
          : isCompleted
            ? 'bg-neo-lime'
            : 'bg-slate-600'
        }
        ${isActive ? 'scale-125' : 'hover:scale-110'}
      `}
      aria-label={`Step ${index + 1}: ${step.title}`}
    />
  );
};

// Main HowToPlay Component
const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  const { t, dir, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [interactiveDemoCompleted, setInteractiveDemoCompleted] = useState(false);

  // Get the demo configuration for the current language, fallback to English
  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  // Steps with colors matching step content
  const steps: Step[] = useMemo(() => [
    {
      id: 'basics',
      icon: Gamepad2,
      title: t('howToPlay.steps.basics.title') || 'Basics',
      bgColor: 'bg-neo-cyan',
      dotColor: 'bg-neo-cyan',
    },
    {
      id: 'grid',
      icon: Pointer,
      title: t('howToPlay.steps.grid.title') || 'How to Play',
      bgColor: 'bg-neo-lime',
      dotColor: 'bg-neo-lime',
    },
    {
      id: 'scoring',
      icon: Star,
      title: t('howToPlay.steps.scoring.title') || 'Scoring',
      bgColor: 'bg-neo-yellow',
      dotColor: 'bg-neo-yellow',
    },
  ], [t]);

  const nextStep = useCallback((): void => {
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const prevStep = useCallback((): void => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const isRTL = dir === 'rtl';
  const activeStep = steps[currentStep] ?? steps[0];

  // Handle swipe gestures for navigation
  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

    // RTL: swipe directions are reversed
    const shouldGoNext = isRTL
      ? (offset > swipeThreshold || velocity > 500)
      : (offset < -swipeThreshold || velocity < -500);

    const shouldGoPrev = isRTL
      ? (offset < -swipeThreshold || velocity < -500)
      : (offset > swipeThreshold || velocity > 500);

    if (shouldGoNext && currentStep < steps.length - 1) {
      nextStep();
    } else if (shouldGoPrev && currentStep > 0) {
      prevStep();
    }
  }, [currentStep, isRTL, nextStep, prevStep, steps.length]);

  const renderStepContent = (): React.ReactNode => {
    const step = steps[currentStep];
    if (!step) return null;
    switch (step.id) {
      case 'basics':
        return (
          <div className="space-y-3">
            <p className="text-neo-cream/90 leading-relaxed text-sm">
              {t('howToPlay.steps.basics.description')}
            </p>

            <div className="space-y-2">
              {([
                { id: 'create-join', icon: Users, title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
                { id: 'host-starts', icon: Clock, title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
                { id: 'earn-points', icon: Trophy, title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
              ] as StepItem[]).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.08 }}
                  className="flex gap-2.5 items-start p-2.5 rounded-neo bg-slate-800/60 border border-slate-600"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-neo-cyan text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-neo-white text-sm">{item.title}</h4>
                    <p className="text-xs text-slate-300 leading-tight">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-3">
            <p className="text-neo-cream/90 leading-relaxed text-sm">
              {t('howToPlay.steps.grid.description')}
            </p>

            {/* Instruction banner - shows before demo is completed */}
            {!interactiveDemoCompleted && (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-neo-lime border-2 border-neo-black rounded-neo p-2.5 shadow-hard-sm text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-0.5">
                  <Pointer className="w-4 h-4 text-neo-black animate-bounce" />
                  <span className="font-bold text-neo-black text-sm">
                    {t('onboarding.welcome.demoInstruction') || 'Swipe to form:'}
                  </span>
                </div>
                <div className="text-xl font-black text-neo-black">
                  {demoConfig.word}
                </div>
              </motion.div>
            )}

            {/* Interactive hands-on demo grid - more compact */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 rounded-neo border border-slate-600 p-3"
            >
              <MiniGrid
                size={3}
                letters={demoConfig.letters}
                demoWord={demoConfig.word}
                demoPath={demoConfig.path}
                onDemoComplete={() => setInteractiveDemoCompleted(true)}
                showHints={true}
              />
            </motion.div>

            {/* Success message when demo completed */}
            {interactiveDemoCompleted && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-neo-lime border-2 border-neo-black rounded-neo p-2.5 shadow-hard-sm text-center"
              >
                <div className="text-base font-black text-neo-black flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  {t('onboarding.welcome.demoSuccess') || "You've got it!"}
                </div>
              </motion.div>
            )}

            <div className="flex items-start gap-2 p-2.5 rounded-neo bg-slate-800/60 border border-slate-600">
              <Lightbulb className="w-4 h-4 text-neo-yellow flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-tight">
                {t('howToPlay.findWordsNote')}
              </p>
            </div>
          </div>
        );

      case 'scoring':
        return (
          <div className="space-y-3">
            <p className="text-neo-cream/90 leading-relaxed text-sm">
              {t('howToPlay.steps.scoring.description')}
            </p>

            {/* Scoring Card - more compact */}
            <div className="bg-neo-yellow rounded-neo border-2 border-neo-black p-3 text-center shadow-hard-sm">
              <p className="font-black text-neo-black text-base mb-2">
                {t('howToPlay.scoringTable.formula')}
              </p>
              <div className="flex justify-center gap-2 flex-wrap">
                {[
                  { letters: '3', points: 2 },
                  { letters: '5', points: 4 },
                  { letters: '7+', points: '6+' },
                ].map((item) => (
                  <div
                    key={`scoring-${item.letters}`}
                    className="bg-neo-black text-neo-yellow rounded-neo px-2.5 py-1.5"
                  >
                    <span className="font-bold text-sm">
                      {item.letters} {t('howToPlay.letters')} = {item.points} {t('howToPlay.pts')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus features mention */}
            <div className="flex items-start gap-2 p-2.5 rounded-neo bg-slate-800/60 border border-slate-600">
              <Flame className="w-4 h-4 text-neo-orange flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-tight">
                {t('howToPlay.steps.combo.description') || 'Find words quickly for combo bonuses!'}
              </p>
            </div>

            {/* Quick Tips - integrated into scoring step */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-2.5 rounded-neo bg-neo-pink/15 border border-neo-pink/40"
            >
              <h4 className="font-bold text-neo-pink mb-1.5 flex items-center gap-2 text-sm">
                <Lightbulb className="w-3.5 h-3.5" />
                {t('howToPlay.tipsTitle')}
              </h4>
              <ul className="space-y-1 text-xs text-slate-300">
                {[1, 2, 4].map((num) => (
                  <li key={num} className="flex items-start gap-1.5">
                    <Check className="w-3 h-3 text-neo-lime mt-0.5 flex-shrink-0" />
                    <span className="leading-tight">{t(`howToPlay.tips.tip${num}`)}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full bg-neo-navy"
      dir={dir}
    >
      {/* Compact Header with Icon, Title, and Dots */}
      <div
        data-testid="compact-header"
        className={`${activeStep.bgColor} p-3 border-b-2 border-neo-black flex items-center justify-between`}
      >
        {/* Step Icon + Title */}
        <div className="flex items-center gap-2">
          {activeStep && React.createElement(activeStep.icon, { className: 'w-5 h-5 text-neo-black' })}
          <h3 className="text-base font-black text-neo-black">
            {activeStep?.title}
          </h3>
        </div>

        {/* Step Dots */}
        <div data-testid="step-dots" className="flex items-center gap-2">
          {steps.map((step, index) => (
            <StepDot
              key={step.id}
              step={step}
              index={index}
              currentStep={currentStep}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
      </div>

      {/* Step Content - Swipeable */}
      <div
        data-testid="swipe-container"
        className="touch-pan-y"
      >
        <motion.div
          data-testid="step-content"
          className="p-3 sm:p-4 min-h-[200px] sm:min-h-[280px]"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
              transition={{ duration: 0.15 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Compact Navigation Footer */}
      <div
        data-testid="nav-footer"
        className="flex justify-between items-center p-3 bg-slate-900/80 border-t border-slate-700"
      >
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="bg-slate-700 border-slate-600 text-neo-cream hover:bg-slate-600 disabled:opacity-40 text-sm px-3 py-2 h-auto"
        >
          <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
        </Button>

        <span className="text-sm font-bold text-slate-400">
          {currentStep + 1}/{steps.length}
        </span>

        {currentStep === steps.length - 1 ? (
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-neo-lime border-neo-black text-neo-black hover:bg-neo-lime/80 text-sm px-4 py-2 h-auto shadow-hard-sm"
          >
            <Check className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={nextStep}
            className="bg-neo-cyan border-neo-black text-neo-black hover:bg-neo-cyan/80 text-sm px-3 py-2 h-auto shadow-hard-sm"
          >
            <ChevronRight className="w-4 h-4 rtl:rotate-180" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default HowToPlay;
