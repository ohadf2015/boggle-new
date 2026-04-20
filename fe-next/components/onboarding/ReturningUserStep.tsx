'use client';

import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { markOnboardingSkipped } from '@/utils/onboardingStorage';

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
    <div className="relative flex flex-col items-center justify-center gap-10 text-center px-5 py-10 overflow-hidden">
      {/* Decorative backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-neo-lime/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-20 w-72 h-72 rounded-full bg-neo-pink/15 blur-3xl" />
        <div className="absolute inset-0 texture-halftone opacity-30" />
      </div>

      {/* Hero */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col items-center gap-5"
      >
        <motion.div
          variants={itemVariants}
          className="relative flex items-center justify-center"
        >
          {/* Pulsing ring */}
          <motion.div
            aria-hidden="true"
            className="absolute inset-0 rounded-full bg-neo-lime/30 blur-2xl"
            animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.8, 0.55] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            animate={{ rotate: [0, -3, 3, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="relative w-32 h-32 rounded-full bg-neo-lime border-neo-thick border-black shadow-hard-lg flex items-center justify-center overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- animated GIF, next/image doesn't animate */}
            <img
              src="/mascot/v1/spectating-nobg.gif"
              alt={t('onboarding.returningUser.title')}
              className="w-28 h-28 object-contain"
              draggable={false}
            />
          </motion.div>
          {/* Sparkles */}
          <motion.span
            aria-hidden="true"
            className="absolute -top-2 -right-2 text-2xl"
            animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          >
            ✨
          </motion.span>
          <motion.span
            aria-hidden="true"
            className="absolute -bottom-1 -left-3 text-xl"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          >
            ⭐
          </motion.span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="font-neo-display text-5xl sm:text-6xl text-neo-white leading-[1.05] tracking-tight drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]"
        >
          {t('onboarding.returningUser.title')}
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="font-neo-body text-neo-cream/75 text-base sm:text-lg max-w-[22rem] leading-relaxed"
        >
          {t('onboarding.returningUser.subtitle')}
        </motion.p>
      </motion.div>

      {/* Actions */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col w-full max-w-xs gap-3.5"
      >
        <motion.button
          variants={itemVariants}
          whileHover={{ y: -2 }}
          whileTap={{ y: 1 }}
          onClick={onHaveAccount}
          className="group relative w-full py-4 px-6 bg-neo-lime text-neo-navy font-neo-display text-xl uppercase tracking-wide border-neo-thick border-black rounded-neo shadow-hard-lg hover:shadow-hard-pressed active:shadow-hard-pressed transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <span aria-hidden="true" className="text-2xl">🎮</span>
            <span>{t('onboarding.returningUser.haveAccount')}</span>
          </span>
        </motion.button>

        <motion.button
          variants={itemVariants}
          whileHover={{ y: -2 }}
          whileTap={{ y: 1 }}
          onClick={onNew}
          className="group relative w-full py-4 px-6 bg-neo-cyan text-neo-navy font-neo-display text-xl uppercase tracking-wide border-neo-thick border-black rounded-neo shadow-hard-lg hover:shadow-hard-pressed active:shadow-hard-pressed transition-all"
        >
          <span className="flex items-center justify-center gap-2">
            <span aria-hidden="true" className="text-2xl">✨</span>
            <span>{t('onboarding.returningUser.newHere')}</span>
          </span>
        </motion.button>

        <motion.button
          variants={itemVariants}
          whileHover={{ opacity: 1 }}
          onClick={handleSkip}
          className="w-full py-3 px-6 bg-transparent text-neo-white/55 font-neo-body text-sm tracking-wide underline-offset-4 hover:underline hover:text-neo-white/85 transition-colors"
        >
          {t('onboarding.returningUser.skip')}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ReturningUserStep;
