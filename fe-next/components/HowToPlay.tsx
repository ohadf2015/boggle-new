'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { m, AnimatePresence, PanInfo } from 'framer-motion';
import {
  Gamepad2, Users, PlayCircle, Swords, Star, Flame,
  ArrowRight, ArrowLeft, Lightbulb,
  Check, CheckCircle2, Pointer, X, Zap,
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
  headerBg: string;
  accentColor: string;
  glowColor: string;
  dotColor: string;
}

interface StepItem {
  id: string;
  icon: LucideIcon;
  iconBg: string;
  accentBorder: string;
  title: string;
  desc: string;
}

interface HowToPlayProps {
  onClose: () => void;
}

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
      accentColor: '#00FFFF',
      glowColor: 'shadow-[0_0_20px_rgba(0,255,255,0.3)]',
      dotColor: 'bg-neo-cyan',
    },
    {
      id: 'grid',
      icon: Pointer,
      title: t('howToPlay.steps.grid.title'),
      subtitle: t('howToPlay.connectingDots'),
      headerBg: 'bg-neo-lime',
      accentColor: '#BFFF00',
      glowColor: 'shadow-[0_0_20px_rgba(191,255,0,0.3)]',
      dotColor: 'bg-neo-lime',
    },
    {
      id: 'scoring',
      icon: Star,
      title: t('howToPlay.steps.scoring.title'),
      subtitle: t('howToPlay.levelUpGame'),
      headerBg: 'bg-neo-pink',
      accentColor: '#FF1493',
      glowColor: 'shadow-[0_0_20px_rgba(255,20,147,0.3)]',
      dotColor: 'bg-neo-pink',
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

  /* ─── Basics: Timeline Cards ─── */
  const renderBasicsContent = (): React.ReactNode => {
    const items: StepItem[] = [
      { id: 'create-join', icon: Users, iconBg: 'bg-neo-cyan', accentBorder: 'border-neo-cyan', title: t('howToPlay.createOrJoinTitle'), desc: t('howToPlay.createOrJoinDesc') },
      { id: 'host-starts', icon: PlayCircle, iconBg: 'bg-neo-lime', accentBorder: 'border-neo-lime', title: t('howToPlay.hostStartsTitle'), desc: t('howToPlay.hostStartsDesc') },
      { id: 'earn-points', icon: Swords, iconBg: 'bg-neo-pink', accentBorder: 'border-neo-pink', title: t('howToPlay.earnPointsTitle'), desc: t('howToPlay.earnPointsDesc') },
    ];

    return (
      <div className="space-y-3">
        <p className="text-slate-300 font-medium text-sm text-center px-2 leading-relaxed">
          {t('howToPlay.steps.basics.description')}
        </p>

        {/* Timeline */}
        <div className="relative">
          {/* Vertical connector line */}
          <div className="absolute top-6 bottom-6 inset-s-[23px] rtl:start-auto rtl:inset-e-[23px] w-[3px] bg-linear-to-b from-neo-cyan via-neo-lime to-neo-pink opacity-40" />

          <div className="space-y-4 relative">
            {items.map((item, index) => (
              <m.div
                key={item.id}
                initial={{ x: isRTL ? 30 : -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.12, type: 'spring', stiffness: 300, damping: 24 }}
                className="flex gap-4 items-start"
              >
                {/* Icon node on timeline */}
                <div className="relative z-10 shrink-0">
                  <div className={`w-12 h-12 ${item.iconBg} border-3 border-neo-black rounded-xl shadow-hard-sm flex items-center justify-center`}>
                    <item.icon className="w-6 h-6 text-neo-black" strokeWidth={2.5} />
                  </div>
                  {/* Step number badge */}
                  <div className="absolute -top-1.5 -inset-e-1.5 w-6 h-6 bg-neo-black text-white text-xs font-black flex items-center justify-center rounded-md border-2 border-white/80">
                    {index + 1}
                  </div>
                </div>

                {/* Card */}
                <div className={`flex-1 bg-neo-navy-light/80 border-2 ${item.accentBorder}/30 rounded-xl p-3.5 backdrop-blur-xs`}>
                  <h4 className="font-neo-display font-black text-white text-base uppercase leading-tight">
                    {item.title}
                  </h4>
                  <p className="text-slate-400 text-sm leading-snug mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  /* ─── Grid: Interactive Demo ─── */
  const renderGridContent = (): React.ReactNode => (
    <div className="space-y-4">
      {/* Instruction banner */}
      {!interactiveDemoCompleted && (
        <m.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-neo-lime/10 border-2 border-neo-lime/40 rounded-xl p-3 flex items-center justify-center gap-3"
        >
          <div className="w-8 h-8 bg-neo-lime border-2 border-neo-black rounded-lg flex items-center justify-center shrink-0">
            <Pointer className="w-4 h-4 text-neo-black animate-bounce" />
          </div>
          <span className="font-bold text-white text-sm">
            {t('onboarding.welcome.demoInstruction')}{' '}
            <span className="text-neo-lime font-black">{demoConfig.word}</span>
          </span>
        </m.div>
      )}

      {/* Interactive demo grid */}
      <m.div
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
      </m.div>

      {/* Success message */}
      {interactiveDemoCompleted && (
        <m.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className="bg-neo-lime/15 border-2 border-neo-lime/50 rounded-xl p-3 text-center"
        >
          <div className="text-base font-black text-neo-lime flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            {t('onboarding.welcome.demoSuccess')}
          </div>
        </m.div>
      )}

      {/* Tip card */}
      <div className="bg-neo-navy-light/60 border-2 border-slate-600/40 rounded-xl p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-neo-lime/20 border-2 border-neo-lime/40 rounded-lg shrink-0 flex items-center justify-center">
            <Lightbulb className="w-4 h-4 text-neo-lime" />
          </div>
          <p className="text-slate-300 text-sm leading-snug">
            {t('howToPlay.findWordsNote')}
          </p>
        </div>
      </div>
    </div>
  );

  /* ─── Scoring: Multipliers + Combos ─── */
  const renderScoringContent = (): React.ReactNode => (
    <div className="space-y-4">
      {/* Scoring table */}
      <div className="bg-neo-navy-light/80 border-2 border-neo-pink/30 rounded-xl p-4 overflow-hidden relative">
        <h4 className="font-neo-display font-black text-neo-pink text-base uppercase mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          {t('howToPlay.scoreMultipliers')}
        </h4>
        <div className="space-y-2">
          {[
            { letters: '3', points: '2', width: '33%' },
            { letters: '5', points: '4', width: '60%' },
            { letters: '7+', points: '6+', width: '100%' },
          ].map((item, i) => (
            <m.div
              key={`scoring-${item.letters}`}
              initial={{ x: isRTL ? 20 : -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.08 }}
              className="relative bg-neo-navy/60 rounded-lg overflow-hidden"
            >
              {/* Fill bar behind */}
              <div
                className="absolute inset-y-0 inset-s-0 bg-neo-pink/15"
                style={{ width: item.width }}
              />
              <div className="relative flex justify-between items-center px-4 py-2.5">
                <span className="font-bold text-slate-300 text-sm">
                  {item.letters} {t('howToPlay.letters')}
                </span>
                <span className="font-black text-neo-pink text-lg">
                  {item.points} {t('howToPlay.pts').toUpperCase()}
                </span>
              </div>
            </m.div>
          ))}
        </div>
      </div>

      {/* Combo bonus */}
      <div className="bg-neo-navy-light/80 border-2 border-neo-cyan/30 rounded-xl p-4 flex gap-3.5 items-center">
        <div className="w-11 h-11 bg-neo-cyan/20 border-2 border-neo-cyan/40 rounded-lg flex items-center justify-center shrink-0">
          <Flame className="w-6 h-6 text-neo-cyan animate-pulse" />
        </div>
        <div>
          <h5 className="text-white font-black uppercase text-sm">
            {t('howToPlay.comboBonus')}
          </h5>
          <p className="text-slate-400 text-xs leading-tight mt-0.5">
            {t('howToPlay.steps.combo.description')}
          </p>
        </div>
      </div>

      {/* Pro tips */}
      <m.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-neo-navy-light/40 border-2 border-slate-600/30 rounded-xl p-4"
      >
        <h4 className="text-slate-300 font-black uppercase text-xs mb-3 flex items-center gap-2 tracking-wider">
          <Lightbulb className="w-3.5 h-3.5 text-neo-lime" />
          {t('howToPlay.proTipsTitle')}
        </h4>
        <ul className="space-y-2.5">
          {[1, 2, 4].map((num) => (
            <li key={num} className="flex gap-2.5 items-start">
              <CheckCircle2 className="w-4 h-4 text-neo-lime mt-0.5 shrink-0" />
              <span className="text-slate-300 text-sm leading-tight">
                {t(`howToPlay.tips.tip${num}`)}
              </span>
            </li>
          ))}
        </ul>
      </m.div>
    </div>
  );

  const stepContent = (() => {
    switch (activeStep.id) {
      case 'basics': return renderBasicsContent();
      case 'grid': return renderGridContent();
      case 'scoring': return renderScoringContent();
      default: return null;
    }
  })();

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full bg-neo-navy overflow-hidden"
      dir={dir}
    >
      {/* ─── Header ─── */}
      <div className="relative overflow-hidden">
        {/* Diagonal stripe accent */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(
              ${isRTL ? '-45deg' : '45deg'},
              transparent,
              transparent 8px,
              ${activeStep.accentColor} 8px,
              ${activeStep.accentColor} 10px
            )`,
          }}
        />

        {/* Top bar: step counter + close */}
        <div data-testid="progress-section" className="relative flex items-center justify-between px-5 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">
              {t('howToPlay.missionBriefing')}
            </span>
            <span className="text-slate-400 text-xs font-mono">{currentStep + 1} / {steps.length}</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-neo-navy-light border-2 border-slate-600 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>

        {/* Step title area */}
        <div data-testid="compact-header" className="relative px-5 pb-5 pt-1">
          <div className="flex items-center gap-3.5">
            {/* Icon with glow ring */}
            <m.div
              key={activeStep.id}
              initial={{ scale: 0.8, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={`relative w-14 h-14 ${activeStep.headerBg} border-3 border-neo-black rounded-xl shadow-hard-sm flex items-center justify-center`}
            >
              {React.createElement(activeStep.icon, { className: 'w-7 h-7 text-neo-black', strokeWidth: 2.5 })}
              {/* Pulse ring */}
              <m.div
                className={`absolute inset-0 rounded-xl border-2`}
                style={{ borderColor: activeStep.accentColor }}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </m.div>

            <div className="flex-1 min-w-0">
              <AnimatePresence mode="wait">
                <m.div
                  key={activeStep.id}
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <h2 className="font-neo-display font-black text-xl text-white uppercase leading-none">
                    {activeStep.title}
                  </h2>
                </m.div>
              </AnimatePresence>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide mt-1">
                {activeStep.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Segmented progress bar */}
        <div className="px-5 pb-4 flex gap-1.5">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className="flex-1 h-1.5 rounded-full transition-all duration-300 relative overflow-hidden"
                style={{
                  backgroundColor: isActive || isCompleted
                    ? activeStep.accentColor
                    : 'rgba(255,255,255,0.08)',
                  boxShadow: isActive ? `0 0 12px ${activeStep.accentColor}40` : 'none',
                }}
                aria-label={`${t('tutorial.stepLabel', { current: index + 1, total: steps.length })}: ${step.title}`}
              >
                {isActive && (
                  <m.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)` }}
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider line */}
      <div className="h-px bg-linear-to-r from-transparent via-slate-600/50 to-transparent" />

      {/* ─── Swipeable Content ─── */}
      <div data-testid="swipe-container" className="touch-pan-y">
        <m.div
          data-testid="step-content"
          className="p-5 min-h-[260px] sm:min-h-[320px] max-h-[55vh] overflow-y-auto"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={handleDragEnd}
        >
          <AnimatePresence mode="wait">
            <m.div
              key={currentStep}
              initial={{ opacity: 0, x: isRTL ? -30 : 30, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: isRTL ? 30 : -30, scale: 0.97 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {stepContent}
            </m.div>
          </AnimatePresence>
        </m.div>
      </div>

      {/* ─── Navigation Footer ─── */}
      <div className="h-px bg-linear-to-r from-transparent via-slate-600/50 to-transparent" />
      <div
        data-testid="nav-footer"
        className="flex justify-between items-center px-5 py-4 bg-neo-navy/50"
      >
        {/* Back button */}
        <button
          onClick={prevStep}
          disabled={currentStep === 0}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-3 border-neo-black font-bold uppercase text-sm transition-all
            disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none disabled:border-slate-700
            bg-neo-navy-light text-white shadow-hard-sm
            hover:enabled:-translate-x-0.5 hover:enabled:-translate-y-0.5 hover:enabled:shadow-hard
            active:enabled:translate-x-0.5 active:enabled:translate-y-0.5 active:enabled:shadow-hard-pressed"
        >
          <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
          <span>{t('howToPlay.back')}</span>
        </button>

        {/* Step indicator — mobile-visible pill dots */}
        <div data-testid="step-dots" className="hidden sm:flex items-center gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className="relative transition-all duration-200"
                aria-label={`${t('tutorial.stepLabel', { current: index + 1, total: steps.length })}: ${step.title}`}
              >
                <div
                  className={`rounded-full transition-all duration-300 ${
                    isActive ? 'w-6 h-2.5' : 'w-2.5 h-2.5'
                  }`}
                  style={{
                    backgroundColor: isActive || index < currentStep
                      ? activeStep.accentColor
                      : 'rgba(255,255,255,0.15)',
                  }}
                />
              </button>
            );
          })}
        </div>

        {/* Next / Done button */}
        {currentStep === steps.length - 1 ? (
          <m.button
            onClick={onClose}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-3 border-neo-black font-bold uppercase text-sm
              bg-neo-lime text-neo-black shadow-hard-sm
              hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard
              active:translate-x-0.5 active:translate-y-0.5 active:shadow-hard-pressed transition-all"
          >
            <span>{t('howToPlay.done')}</span>
            <Check className="w-5 h-5" strokeWidth={3} />
          </m.button>
        ) : (
          <m.button
            onClick={nextStep}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl border-3 border-neo-black font-bold uppercase text-sm transition-all"
            style={{
              backgroundColor: activeStep.accentColor,
              color: '#000',
              boxShadow: `2px 2px 0px #000`,
            }}
          >
            <span>{t('howToPlay.nextStep')}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </m.button>
        )}
      </div>
    </m.div>
  );
};

export default HowToPlay;
