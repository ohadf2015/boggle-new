'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Pointer, Star, Zap, Play, Mouse, Palette, ChevronRight, ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { Mascot, MascotWithEntrance } from '@/components/ui/Mascot';
import { NeoPanel } from '@/components/ui/panel';
import MiniGrid from '@/components/onboarding/MiniGrid';
import AvatarBuilderModal from '@/components/avatar/AvatarBuilderModal';
import { useAuth } from '@/contexts/AuthContext';
import { BoostButton } from '@/components/boosts/BoostButton';
import { demoConfigs } from '@/components/onboarding/demoConfigs';

interface PreGameTutorialProps {
  onComplete: () => void;
  sessionId: string;
}

const TOTAL_STEPS = 3;

/** Shared spring configs */
const SPRING_POP = { type: 'spring' as const, stiffness: 500, damping: 22 };
const SPRING_SOFT = { type: 'spring' as const, stiffness: 300, damping: 26 };

/** Step transition helper — flips x direction for RTL */
const getStepTransition = (dir: number, rtl: boolean) => {
  const flip = rtl ? -1 : 1;
  return {
    initial: { opacity: 0, x: dir * 80 * flip, scale: 0.95 },
    animate: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 26 } },
    exit: { opacity: 0, x: dir * -80 * flip, scale: 0.95, transition: { duration: 0.2 } },
  };
};

const PreGameTutorial: React.FC<PreGameTutorialProps> = ({ onComplete, sessionId }) => {
  const { t, language, dir } = useLanguage();
  const isRTL = dir === 'rtl';
  const isDesktop = useIsDesktop();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isAvatarBuilderOpen, setIsAvatarBuilderOpen] = useState(false);
  const { profile } = useAuth();

  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  const handleNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS - 1) {
      setDirection(1);
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleDemoComplete = useCallback(() => {
    setDirection(1);
    setCurrentStep(2);
  }, []);

  const tips = [
    { icon: isDesktop ? Mouse : Pointer, titleKey: isDesktop ? 'onboarding.quickTips.tip1TitleDesktop' : 'onboarding.quickTips.tip1Title', textKey: isDesktop ? 'onboarding.quickTips.tip1TextDesktop' : 'onboarding.quickTips.tip1Text' },
    { icon: Star, titleKey: 'onboarding.quickTips.tip2Title', textKey: 'onboarding.quickTips.tip2Text' },
    { icon: Zap, titleKey: 'onboarding.quickTips.tip3Title', textKey: 'onboarding.quickTips.tip3Text' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-neo-navy flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Subtle radial gradient backdrop */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(132,204,22,0.06)_0%,transparent_70%)] pointer-events-none" />

      {/* Skip button — higher z-index to stay above step animations */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onComplete();
        }}
        className="absolute top-4 right-4 z-[60] text-neo-white hover:text-neo-white text-sm font-bold px-4 py-2 rounded-neo border-2 border-neo-white/30 hover:border-neo-white/60 hover:bg-neo-white/10 transition-colors cursor-pointer"
      >
        {t('preGameTutorial.skip')}
      </button>

      {/* Step content with directional transitions */}
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center justify-center relative">
        <AnimatePresence mode="wait" custom={direction}>
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <m.div
              key="welcome"
              {...getStepTransition(direction, isRTL)}
              className="flex flex-col items-center text-center space-y-4"
            >
              <MascotWithEntrance variant="happy" size="xl" priority clipBorder="none" />

              {/* Speech bubble with staggered entrance */}
              <NeoPanel asChild tone="cream" className="relative p-4 max-w-sm">
              <m.div
                initial={{ scale: 0.8, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ delay: 0.2, ...SPRING_POP }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-12 border-b-neo-black" />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-b-10 border-b-neo-cream" />

                <h2 className="text-xl font-black text-neo-black">
                  {t('preGameTutorial.welcome.title')}
                </h2>
                <p className="text-sm text-neo-black/70 mt-1">
                  {t('preGameTutorial.welcome.subtitle')}
                </p>
              </m.div>
              </NeoPanel>

              <m.button
                onClick={handleNext}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, ...SPRING_SOFT }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96, y: 2 }}
                className="bg-neo-yellow border-3 border-neo-black rounded-neo px-6 py-3 font-black text-neo-black shadow-hard transition-shadow flex items-center gap-2"
              >
                {t('preGameTutorial.next')}
                {isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </m.button>
            </m.div>
          )}

          {/* Step 1: Practice */}
          {currentStep === 1 && (
            <m.div
              key="practice"
              {...getStepTransition(direction, isRTL)}
              className="flex flex-col items-center text-center space-y-4 w-full"
            >
              <m.div
                className="flex flex-col items-center gap-2"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15, ...SPRING_SOFT }}
              >
                <div className="flex items-center gap-3">
                  <Mascot variant="gaming" size="md" clipBorder="none" />
                  <p className="font-bold text-sm text-neo-white">
                    {t('preGameTutorial.practice.instruction')}
                  </p>
                </div>
                <m.div
                  className="bg-neo-yellow border-3 border-neo-black rounded-neo px-6 py-2.5 shadow-hard"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ delay: 0.4, duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <span className="text-2xl sm:text-3xl font-black text-neo-black tracking-widest" dir={isRTL ? 'rtl' : 'ltr'}>
                    {demoConfig.word}
                  </span>
                </m.div>
              </m.div>

              <m.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.25, ...SPRING_SOFT }}
              >
                <MiniGrid
                  size={3}
                  letters={demoConfig.letters}
                  demoWord={demoConfig.word}
                  demoPath={demoConfig.path}
                  onDemoComplete={handleDemoComplete}
                  showHints
                />
              </m.div>
              {/* Removed redundant "skip" — top-right Skip + bottom chevron already cover it. */}
            </m.div>
          )}

          {/* Step 2: Tips & Go */}
          {currentStep === 2 && (
            <m.div
              key="tips"
              {...getStepTransition(direction, isRTL)}
              className="flex flex-col items-center text-center space-y-4 w-full"
            >
              <Mascot variant="celebration" size="lg" clipBorder="none" />

              <NeoPanel asChild tone="cream" className="relative p-4 max-w-sm">
              <m.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, ...SPRING_POP }}
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-12 border-l-transparent border-r-12 border-r-transparent border-b-12 border-b-neo-black" />
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-10 border-l-transparent border-r-10 border-r-transparent border-b-10 border-b-neo-cream" />

                <h2 className="text-lg font-black text-neo-black">
                  {t('preGameTutorial.tips.title')}
                </h2>
                <p className="text-xs text-neo-black/60 mt-0.5">
                  {t('preGameTutorial.tips.subtitle')}
                </p>
              </m.div>
              </NeoPanel>

              {/* Tip cards — staggered entrance */}
              <div className="grid grid-cols-3 gap-2 w-full max-w-sm">
                {tips.map((tip, index) => {
                  const Icon = tip.icon;
                  return (
                    <m.div
                      key={tip.titleKey}
                      initial={{ y: 30, opacity: 0, scale: 0.9 }}
                      animate={{ y: 0, opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + index * 0.1, ...SPRING_POP }}
                      whileHover={{ y: -2, scale: 1.03 }}
                      className="flex flex-col items-center gap-1.5 p-2.5 rounded-neo border-2 border-neo-black shadow-hard-sm bg-neo-cream"
                    >
                      <m.div
                        className="w-8 h-8 bg-neo-lime text-neo-black border-2 border-neo-black rounded-full flex items-center justify-center shadow-hard-sm"
                        initial={{ rotate: -20 }}
                        animate={{ rotate: 0 }}
                        transition={{ delay: 0.3 + index * 0.1, ...SPRING_POP }}
                      >
                        <Icon className="w-4 h-4" />
                      </m.div>
                      <div className="font-black text-[10px] text-neo-black leading-tight">
                        {t(tip.titleKey)}
                      </div>
                      <div className="text-[9px] text-neo-black/60 leading-snug">
                        {t(tip.textKey)}
                      </div>
                    </m.div>
                  );
                })}
              </div>

              {/* Avatar prompt — opens modal instead of navigating */}
              <m.button
                onClick={() => setIsAvatarBuilderOpen(true)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, ...SPRING_SOFT }}
                whileHover={{ scale: 1.03, backgroundColor: 'rgba(139,92,246,0.2)' }}
                whileTap={{ scale: 0.97 }}
                className="flex items-center gap-2 px-4 py-2 rounded-neo border-2 border-neo-white/20 bg-neo-white/5 hover:border-neo-purple/50 transition-colors text-neo-white hover:text-neo-white"
              >
                <Palette className="w-4 h-4" />
                <span className="text-xs font-bold">{t('preGameTutorial.buildAvatar')}</span>
              </m.button>
              <AvatarBuilderModal
                isOpen={isAvatarBuilderOpen}
                onClose={() => setIsAvatarBuilderOpen(false)}
                onSave={() => setIsAvatarBuilderOpen(false)}
                initialConfig={profile?.avatar_config ?? undefined}
                premium={null}
              />

              {/* Boost button and Let's Play CTA */}
              <div className="flex flex-col gap-2 items-center">
                <BoostButton mode="sp" sessionId={sessionId} />
                {/* v1: SP boosts apply client-side via useBoostClaim's cached token. */}
                {/* Server-side score multiplier deferred to v2 (per spec). */}
                {/* Let's Play CTA — breathing pulse */}
                <m.button
                  onClick={onComplete}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, ...SPRING_POP }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95, y: 2 }}
                  className="bg-neo-lime border-3 border-neo-black rounded-neo px-8 py-3.5 font-black text-lg text-neo-black shadow-hard transition-shadow flex items-center gap-2"
                >
                  <m.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Play className="w-5 h-5" fill="currentColor" />
                  </m.div>
                  {t('preGameTutorial.letsPlay')}
                </m.button>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation bar with back/forward + progress dots */}
      <div className="flex items-center gap-4 mt-6 mb-4">
        <m.button
          onClick={handleBack}
          animate={{ opacity: currentStep > 0 ? 1 : 0, scale: currentStep > 0 ? 1 : 0.8 }}
          disabled={currentStep === 0}
          className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-neo-white/30 text-neo-white hover:border-neo-white/60 hover:text-neo-white transition-colors disabled:pointer-events-none"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isRTL ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </m.button>

        <div className="flex items-center gap-3">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <m.div
              key={`progress-dot-${i}`}
              data-testid={`progress-dot-${i}`}
              className="border-2 border-neo-black cursor-pointer"
              onClick={() => {
                setDirection(i > currentStep ? 1 : -1);
                setCurrentStep(i);
              }}
              animate={{
                width: i === currentStep ? 24 : 10,
                height: 10,
                borderRadius: 5,
                backgroundColor: i <= currentStep ? '#FFE135' : 'rgba(255,255,255,0.15)',
              }}
              transition={SPRING_POP}
              whileHover={{ scale: 1.2 }}
            />
          ))}
        </div>

        <m.button
          onClick={currentStep < TOTAL_STEPS - 1 ? handleNext : onComplete}
          className="w-9 h-9 flex items-center justify-center rounded-full border-2 border-neo-white/30 text-neo-white hover:border-neo-white/60 hover:text-neo-white transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {isRTL ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </m.button>
      </div>
    </div>
  );
};

export default PreGameTutorial;
