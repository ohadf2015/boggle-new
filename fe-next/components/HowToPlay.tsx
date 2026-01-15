'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  activeColor: string;
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

// Step Tab Button Component
const StepTab: React.FC<{
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
        relative flex-1 min-w-0 py-3 px-2 sm:px-4
        font-bold text-xs sm:text-sm uppercase tracking-wide
        transition-all duration-200
        border-b-4
        ${isActive
          ? `${step.activeColor} border-neo-cyan text-neo-white`
          : isCompleted
            ? 'bg-slate-700/50 border-neo-lime/60 text-neo-lime'
            : 'bg-slate-800/50 border-slate-600 text-slate-400 hover:text-slate-300 hover:border-slate-500'
        }
        ${index === 0 ? 'rounded-tl-neo' : ''}
        ${index === 2 ? 'rounded-tr-neo' : ''}
      `}
    >
      <span className="flex items-center justify-center gap-1.5 sm:gap-2">
        {isCompleted ? (
          <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        ) : (
          <step.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        )}
        <span className="hidden sm:inline truncate">{step.title}</span>
        <span className="sm:hidden">{index + 1}</span>
      </span>
    </button>
  );
};

// Progress Bar Component
const ProgressBar: React.FC<{ currentStep: number; totalSteps: number }> = ({
  currentStep,
  totalSteps,
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-gradient-to-r from-neo-cyan to-neo-lime"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      />
    </div>
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

  // Steps with dark-mode optimized colors
  const steps: Step[] = useMemo(() => [
    {
      id: 'basics',
      icon: Gamepad2,
      title: t('howToPlay.steps.basics.title'),
      bgColor: 'bg-neo-cyan',
      activeColor: 'bg-neo-cyan/20',
    },
    {
      id: 'grid',
      icon: Pointer,
      title: t('howToPlay.steps.grid.title'),
      bgColor: 'bg-neo-lime',
      activeColor: 'bg-neo-lime/20',
    },
    {
      id: 'scoring',
      icon: Star,
      title: t('howToPlay.steps.scoring.title'),
      bgColor: 'bg-neo-yellow',
      activeColor: 'bg-neo-yellow/20',
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
          <div className="space-y-4">
            <p className="text-neo-cream/90 leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.basics.description')}
            </p>

            <div className="space-y-3">
              {([
                { id: 'create-join', icon: Users, title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
                { id: 'host-starts', icon: Clock, title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
                { id: 'earn-points', icon: Trophy, title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
              ] as StepItem[]).map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex gap-3 items-start p-3 rounded-neo bg-slate-800/60 border-2 border-slate-600"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-neo-cyan text-neo-black rounded-neo border-2 border-neo-black flex items-center justify-center shadow-hard-sm">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-neo-white text-sm sm:text-base">{item.title}</h4>
                    <p className="text-xs sm:text-sm text-slate-300">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-4">
            <p className="text-neo-cream/90 leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.grid.description')}
            </p>

            {/* Instruction banner - shows before demo is completed */}
            {!interactiveDemoCompleted && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-neo-lime border-3 border-neo-black rounded-neo p-3 shadow-hard text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Pointer className="w-5 h-5 text-neo-black animate-bounce" />
                  <span className="font-bold text-neo-black text-sm">
                    {t('onboarding.welcome.demoInstruction') || 'Swipe to form:'}
                  </span>
                </div>
                <div className="text-2xl font-black text-neo-black">
                  {demoConfig.word}
                </div>
              </motion.div>
            )}

            {/* Interactive hands-on demo grid */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-800/60 rounded-neo border-2 border-slate-600 p-4"
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
                className="bg-neo-lime border-3 border-neo-black rounded-neo p-3 shadow-hard text-center"
              >
                <div className="text-lg font-black text-neo-black flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  {t('onboarding.welcome.demoSuccess') || "You've got it!"}
                </div>
              </motion.div>
            )}

            <div className="flex items-start gap-2 p-3 rounded-neo bg-slate-800/60 border-2 border-slate-600">
              <Lightbulb className="w-5 h-5 text-neo-yellow flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-300">
                {t('howToPlay.findWordsNote')}
              </p>
            </div>
          </div>
        );

      case 'scoring':
        return (
          <div className="space-y-4">
            <p className="text-neo-cream/90 leading-relaxed text-sm sm:text-base">
              {t('howToPlay.steps.scoring.description')}
            </p>

            {/* Scoring Card */}
            <div className="bg-neo-yellow rounded-neo border-3 border-neo-black p-4 text-center shadow-hard">
              <p className="font-black text-neo-black text-lg mb-3">
                {t('howToPlay.scoringTable.formula')}
              </p>
              <div className="flex justify-center gap-2 sm:gap-3 flex-wrap">
                {[
                  { letters: '3', points: 2 },
                  { letters: '5', points: 4 },
                  { letters: '7+', points: '6+' },
                ].map((item) => (
                  <div
                    key={`scoring-${item.letters}`}
                    className="bg-neo-black text-neo-yellow rounded-neo px-3 py-2 sm:px-4"
                  >
                    <span className="font-bold text-sm sm:text-base">
                      {item.letters} {t('howToPlay.letters')} = {item.points} {t('howToPlay.pts')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonus features mention */}
            <div className="flex items-start gap-2 p-3 rounded-neo bg-slate-800/60 border-2 border-slate-600">
              <Flame className="w-5 h-5 text-neo-orange flex-shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-slate-300">
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full bg-neo-navy"
      dir={dir}
    >
      {/* Header with Tabs */}
      <div className="bg-slate-900 border-b-2 border-slate-700">
        {/* Tab Navigation */}
        <div className="flex">
          {steps.map((step, index) => (
            <StepTab
              key={step.id}
              step={step}
              index={index}
              currentStep={currentStep}
              onClick={() => setCurrentStep(index)}
            />
          ))}
        </div>
        {/* Progress Bar */}
        <ProgressBar currentStep={currentStep} totalSteps={steps.length} />
      </div>

      {/* Step Title Banner */}
      <motion.div
        key={`title-${currentStep}`}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${activeStep.bgColor} p-4 border-b-3 border-neo-black`}
      >
        <h3 className="text-lg sm:text-xl font-black text-neo-black flex items-center justify-center gap-2">
          {activeStep && React.createElement(activeStep.icon, { className: 'w-5 h-5 sm:w-6 sm:h-6' })}
          {activeStep?.title}
        </h3>
      </motion.div>

      {/* Step Content */}
      <div className="p-4 sm:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: isRTL ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isRTL ? 30 : -30 }}
            transition={{ duration: 0.2 }}
            className="min-h-[260px] sm:min-h-[300px]"
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Quick Tips - Only show on last step */}
        {currentStep === steps.length - 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-3 rounded-neo bg-neo-pink/15 border-2 border-neo-pink/40"
          >
            <h4 className="font-bold text-neo-pink mb-2 flex items-center gap-2 text-sm">
              <Lightbulb className="w-4 h-4" />
              {t('howToPlay.tipsTitle')}
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-300">
              {[1, 2, 4].map((num) => (
                <li key={num} className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-neo-lime mt-0.5 flex-shrink-0" />
                  <span>{t(`howToPlay.tips.tip${num}`)}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex justify-between items-center p-4 bg-slate-900/80 border-t-2 border-slate-700 gap-3">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 0}
          className="bg-slate-700 border-slate-600 text-neo-cream hover:bg-slate-600 disabled:opacity-40 text-sm px-3 sm:px-4"
        >
          <ChevronLeft className="w-4 h-4 me-1 rtl:rotate-180" />
          <span className="hidden sm:inline">{t('common.back')}</span>
        </Button>

        <span className="text-sm font-bold text-slate-400">
          {currentStep + 1} / {steps.length}
        </span>

        {currentStep === steps.length - 1 ? (
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-neo-lime border-neo-black text-neo-black hover:bg-neo-lime/80 text-sm px-3 sm:px-4 shadow-hard-sm"
          >
            <span className="hidden sm:inline">{t('common.understood')}</span>
            <span className="sm:hidden">OK</span>
            <Check className="w-4 h-4 ms-1" />
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={nextStep}
            className="bg-neo-cyan border-neo-black text-neo-black hover:bg-neo-cyan/80 text-sm px-3 sm:px-4 shadow-hard-sm"
          >
            <span>{t('common.next') || 'Next'}</span>
            <ChevronRight className="w-4 h-4 ms-1 rtl:rotate-180" />
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default HowToPlay;
