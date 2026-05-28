'use client';

import React from 'react';
import { m, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { markOnboardingSkipped } from '@/utils/onboardingStorage';
import { SilentVideo } from '@/components/ui/SilentVideo';

interface ReturningUserStepProps {
  onHaveAccount: () => void;
  onNew: () => void;
  onSkip: () => void;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

const ReturningUserStep: React.FC<ReturningUserStepProps> = ({
  onHaveAccount,
  onNew,
  onSkip,
}) => {
  const { t } = useLanguage();

  const handleSkip = () => {
    markOnboardingSkipped();
    onSkip();
  };

  return (
    <div className="relative flex flex-col items-center justify-center gap-10 text-center px-5 py-10">
      {/* Hero */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center gap-5"
      >
        <m.div
          variants={itemVariants}
          className="relative flex items-center justify-center"
        >
          {/* Pulsing ring */}
          <m.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-neo-lime/30 blur-2xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.8, 0.55] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <m.div
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-36 h-36 shrink-0 rounded-full bg-neo-navy border-neo-thick border-black shadow-hard-lg flex items-center justify-center overflow-hidden"
          >
            <SilentVideo
              src="/mascot/spectating.webp"
              className="w-full h-full object-cover"
              preload="metadata"
              aria-label={t('onboarding.returningUser.title')}
            />
          </m.div>
          {/* Sparkles */}
          <m.span
            aria-hidden="true"
            className="absolute -top-2 -right-2 text-2xl"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✨
          </m.span>
          <m.span
            aria-hidden="true"
            className="absolute -bottom-1 -left-3 text-xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          >
            ⭐
          </m.span>
        </m.div>

        <m.h1
          variants={itemVariants}
          className="font-neo-display font-bold text-5xl sm:text-6xl text-neo-white leading-[1.05] tracking-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]"
        >
          {t('onboarding.returningUser.title')}
        </m.h1>

      </m.div>

      {/* Actions */}
      <m.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col w-full max-w-xs gap-3.5"
      >
        <m.button
          variants={itemVariants}
          whileHover={{ y: -2 }}
          whileTap={{ y: 1 }}
          onClick={onHaveAccount}
          className="group relative w-full py-4 px-6 bg-neo-lime text-neo-navy font-neo-display font-black text-xl uppercase tracking-wide border-neo-thick border-black rounded-neo shadow-hard-lg hover:shadow-hard-pressed active:shadow-hard-pressed transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <span aria-hidden="true" className="text-2xl">🎮</span>
            <span>{t('onboarding.returningUser.haveAccount')}</span>
          </span>
        </m.button>

        <m.button
          variants={itemVariants}
          whileHover={{ y: -2 }}
          whileTap={{ y: 1 }}
          onClick={onNew}
          className="group relative w-full py-4 px-6 bg-neo-cyan text-neo-navy font-neo-display font-black text-xl uppercase tracking-wide border-neo-thick border-black rounded-neo shadow-hard-lg hover:shadow-hard-pressed active:shadow-hard-pressed transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <span aria-hidden="true" className="text-2xl">✨</span>
            <span>{t('onboarding.returningUser.newHere')}</span>
          </span>
        </m.button>

        <m.button
          variants={itemVariants}
          whileHover={{ opacity: 1 }}
          onClick={handleSkip}
          className="w-full py-3 px-6 bg-transparent text-neo-white font-neo-body text-sm tracking-wide underline-offset-4 hover:underline hover:text-neo-white transition-colors"
        >
          {t('onboarding.returningUser.skip')}
        </m.button>
      </m.div>
    </div>
  );
};

export default ReturningUserStep;
