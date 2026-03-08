'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Gamepad2, Users, PlayCircle, Swords, Star, Flame,
  ArrowRight, ArrowLeft, Lightbulb,
  Check, CheckCircle2, Pointer, X,
  type LucideIcon
} from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import MiniGrid, { GridPosition } from './onboarding/MiniGrid';

interface DemoConfig {
  letters: string[][];
  path: GridPosition[];
  word: string;
}

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

interface Step {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  /** Tailwind bg class for the header band */
  headerBg: string;
  /** Hex color for the progress bar fill */
  progressColor: string;
  /** Tailwind bg class for step dot when active */
  dotColor: string;
}

interface StepItem {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  title: string;
  desc: string;
}

interface HowToPlayProps {
  onClose: () => void;
}

/** Card rotations for the 3 basics cards */
const CARD_ROTATIONS = ['-rotate-[1.5deg]', 'rotate-[1.2deg]', '-rotate-[0.8deg]'];

const HowToPlay: React.FC<HowToPlayProps> = ({ onClose }) => {
  const { t, dir, language } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [interactiveDemoCompleted, setInteractiveDemoCompleted] = useState(false);

  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  const steps: Step[] = useMemo(() => [
    {
      id: 'basics',
      icon: Gamepad2,
      title: t('howToPlay.steps.basics.title'),
      subtitle: t('howToPlay.masterTheArena'),
      headerBg: 'bg-neo-cyan',
      progressColor: '#00FFFF',
      dotColor: 'bg-neo-cyan',
    },
    {
      id: 'grid',
      icon: Pointer,
      title: t('howToPlay.steps.grid.title'),
      subtitle: t('howToPlay.connectingDots'),
      headerBg: 'bg-neo-lime',
      progressColor: '#BFFF00',
      dotColor: 'bg-neo-lime',
    },
    {
      id: 'scoring',
      icon: Star,
      title: t('howToPlay.steps.scoring.title'),
      subtitle: t('howToPlay.levelUpGame'),
      headerBg: 'bg-neo-yellow',
      progressColor: '#FFE135',
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
  const progressWidth = `${((currentStep + 1) / steps.length) * 100}%`;

  const handleDragEnd = useCallback((_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    const velocity = info.velocity.x;
    const offset = info.offset.x;

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

  const renderBasicsContent = (): React.ReactNode => {
    const items: StepItem[] = [
      { id: 'create-join', icon: Users, iconBg: 'bg-neo-cyan', title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
      { id: 'host-starts', icon: PlayCircle, iconBg: 'bg-neo-lime', title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
      { id: 'earn-points', icon: Swords, iconBg: 'bg-neo-pink', title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
    ];

    return (
      <div className="space-y-4">
        <p className="text-white font-medium text-base text-center px-2">
          {t('howToPlay.steps.basics.description')}
        </p>

        <div className="space-y-5">
          {items.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={`bg-neo-cream border-4 border-neo-black rounded-neo-lg shadow-hard p-4 relative ${CARD_ROTATIONS[index]}`}
            >
              {/* Numbered badge */}
              <div className="absolute -top-3.5 -left-2.5 rtl:-right-2.5 rtl:left-auto w-9 h-9 bg-neo-black text-white flex items-center justify-center font-black text-lg border-4 border-white rounded-lg shadow-hard-sm z-10">
                {index + 1}
              </div>
              <div className="flex gap-3.5">
                <div className={`flex-shrink-0 w-12 h-12 ${item.iconBg} border-4 border-neo-black rounded-neo-lg shadow-hard-sm flex items-center justify-center`}>
                  <item.icon className="w-6 h-6 text-neo-black" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-black text-neo-black text-lg uppercase italic">{item.title}</h4>
                  <p className="text-neo-black/80 font-medium text-sm leading-snug">{item.desc}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderGridContent = (): React.ReactNode => (
    <div className="space-y-4">
      {/* Instruction banner */}
      {!interactiveDemoCompleted && (
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-neo-lime border-4 border-neo-black p-3 flex items-center justify-center gap-3 -rotate-[1deg] shadow-hard"
        >
          <Pointer className="w-5 h-5 text-neo-black animate-bounce" />
          <span className="font-black text-neo-black text-lg uppercase">
            {t('onboarding.welcome.demoInstruction')}{' '}
            <span className="underline decoration-4 underline-offset-4">{demoConfig.word}</span>
          </span>
        </motion.div>
      )}

      {/* Interactive demo grid */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-2"
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

      {/* Success message */}
      {interactiveDemoCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-neo-lime border-4 border-neo-black rounded-neo-lg p-3 shadow-hard text-center"
        >
          <div className="text-lg font-black text-neo-black flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            {t('onboarding.welcome.demoSuccess')}
          </div>
        </motion.div>
      )}

      {/* Tip card */}
      <div className="bg-neo-cream border-4 border-neo-black rounded-neo-lg p-4 shadow-hard rotate-[0.5deg]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-neo-yellow border-2 border-neo-black rounded-lg flex-shrink-0 flex items-center justify-center shadow-hard-sm">
            <Lightbulb className="w-5 h-5 text-neo-black" />
          </div>
          <p className="font-bold text-neo-black text-sm italic leading-tight">
            {t('howToPlay.findWordsNote')}
          </p>
        </div>
      </div>
    </div>
  );

  const renderScoringContent = (): React.ReactNode => (
    <div className="space-y-4">
      {/* Scoring formula card */}
      <div className="bg-neo-yellow border-4 border-neo-black rounded-neo-lg p-4 shadow-hard rotate-[1.5deg]">
        <h4 className="font-black text-neo-black text-lg uppercase italic mb-3 text-center">
          {t('howToPlay.scoreMultipliers')}
        </h4>
        <div className="space-y-2">
          {[
            { letters: '3', points: '2' },
            { letters: '5', points: '4' },
            { letters: '7+', points: '6+' },
          ].map((item) => (
            <div
              key={`scoring-${item.letters}`}
              className="bg-neo-black text-neo-yellow px-4 py-2 rounded-lg border-2 border-neo-black flex justify-between items-center"
            >
              <span className="font-black uppercase text-sm">
                {item.letters} {t('howToPlay.letters')}
              </span>
              <span className="font-black text-lg">
                {item.points} {t('howToPlay.pts').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Combo bonus card */}
      <div className="bg-slate-800 border-4 border-neo-black rounded-neo-lg p-4 shadow-hard flex gap-3 items-center">
        <div className="w-11 h-11 bg-neo-orange border-2 border-neo-black rounded-lg flex items-center justify-center flex-shrink-0 animate-bounce">
          <Flame className="w-6 h-6 text-neo-black" />
        </div>
        <div>
          <h5 className="text-white font-black uppercase text-sm">
            {t('howToPlay.comboBonus')}
          </h5>
          <p className="text-slate-300 text-xs font-medium leading-tight">
            {t('howToPlay.steps.combo.description')}
          </p>
        </div>
      </div>

      {/* Pro tips section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-neo-pink/15 border-[3px] border-neo-pink/40 rounded-neo-lg p-4"
      >
        <h4 className="text-neo-pink font-black uppercase text-sm mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4" />
          {t('howToPlay.proTipsTitle')}
        </h4>
        <ul className="space-y-2.5">
          {[1, 2, 4].map((num) => (
            <li key={num} className="flex gap-2.5 items-start">
              <CheckCircle2 className="w-4 h-4 text-neo-lime mt-0.5 flex-shrink-0" />
              <span className="text-white text-sm font-medium leading-tight">
                {t(`howToPlay.tips.tip${num}`)}
              </span>
            </li>
          ))}
        </ul>
      </motion.div>
    </div>
  );

  const renderStepContent = (): React.ReactNode => {
    switch (activeStep.id) {
      case 'basics': return renderBasicsContent();
      case 'grid': return renderGridContent();
      case 'scoring': return renderScoringContent();
      default: return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full bg-neo-navy"
      dir={dir}
    >
      {/* Progress Bar Section */}
      <div
        data-testid="progress-section"
        className="bg-slate-900 px-5 py-3.5 border-b-4 border-neo-black"
      >
        <div className="flex justify-between items-center mb-2.5">
          <span className="font-neo-display font-black text-white text-sm tracking-widest uppercase">
            {t('howToPlay.missionBriefing')}
          </span>
          <span className="font-black text-white text-base">
            {currentStep + 1} / {steps.length}
          </span>
        </div>
        <div className="w-full h-4 rounded-full bg-black/30 border-3 border-neo-black overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: activeStep.progressColor }}
            initial={false}
            animate={{ width: progressWidth }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Dynamic Header */}
      <div
        data-testid="compact-header"
        className={`${activeStep.headerBg} p-5 border-b-4 border-neo-black relative`}
      >
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 bg-white border-4 border-neo-black rounded-neo-lg shadow-hard-sm flex items-center justify-center -rotate-[3deg]">
            {React.createElement(activeStep.icon, { className: 'w-7 h-7 text-neo-black' })}
          </div>
          <div>
            <h2 className="font-neo-display font-black text-2xl text-neo-black uppercase leading-none mb-0.5">
              {activeStep.title}
            </h2>
            <p className="font-bold text-neo-black/70 text-xs uppercase">
              {activeStep.subtitle}
            </p>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 end-5 w-10 h-10 bg-neo-pink border-4 border-neo-black rounded-neo-lg shadow-hard-sm flex items-center justify-center hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
          aria-label={t('common.close')}
        >
          <X className="w-5 h-5 text-neo-black" strokeWidth={3} />
        </button>
      </div>

      {/* Swipeable Content */}
      <div data-testid="swipe-container" className="touch-pan-y">
        <motion.div
          data-testid="step-content"
          className="p-5 min-h-[260px] sm:min-h-[320px] max-h-[55vh] overflow-y-auto"
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

      {/* Navigation Footer */}
      <div
        data-testid="nav-footer"
        className="flex justify-between items-center px-5 py-4 bg-slate-900 border-t-4 border-neo-black"
      >
        {/* Back button */}
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-neo-lg border-4 border-neo-black font-bold uppercase text-sm transition-all
            disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            bg-neo-cream text-neo-black shadow-hard-sm
            hover:enabled:-translate-x-0.5 hover:enabled:-translate-y-0.5 hover:enabled:shadow-hard
            active:enabled:translate-x-0.5 active:enabled:translate-y-0.5 active:enabled:shadow-hard-pressed"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('howToPlay.back')}</span>
        </button>

        {/* Step dots */}
        <div data-testid="step-dots" className="hidden sm:flex items-center gap-1.5">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`w-3 h-3 rounded-sm border-2 transition-all duration-200
                  ${isActive || isCompleted
                    ? `${step.dotColor} border-neo-black`
                    : 'bg-neo-black border-slate-600'
                  }
                  ${isActive ? 'scale-125' : 'hover:scale-110'}
                `}
                aria-label={`Step ${index + 1}: ${step.title}`}
              />
            );
          })}
        </div>

        {/* Next / Done button */}
        {currentStep === steps.length - 1 ? (
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-7 py-2.5 rounded-neo-lg border-4 border-neo-black font-bold uppercase text-sm
              bg-neo-lime text-neo-black shadow-hard-sm
              hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard
              active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
          >
            <span>{t('howToPlay.done')}</span>
            <Check className="w-5 h-5" strokeWidth={3} />
          </button>
        ) : (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2.5 rounded-neo-lg border-4 border-neo-black font-bold uppercase text-sm
              bg-neo-cyan text-neo-black shadow-hard-sm
              hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard
              active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
          >
            <span>{t('howToPlay.nextStep')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default HowToPlay;
