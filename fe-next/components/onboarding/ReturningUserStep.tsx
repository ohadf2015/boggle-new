'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { markOnboardingSkipped } from '@/utils/onboardingStorage';

interface ReturningUserStepProps {
  onHaveAccount: () => void;
  onNew: () => void;
  onSkip: () => void;
}

const ReturningUserStep: React.FC<ReturningUserStepProps> = ({ onHaveAccount, onNew, onSkip }) => {
  const { t } = useLanguage();

  const handleSkip = () => {
    markOnboardingSkipped();
    onSkip();
  };

  return (
    <div className="flex flex-col items-center gap-8 text-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center gap-3"
      >
        <h1 className="font-neo-display text-4xl sm:text-5xl text-neo-white leading-tight">
          {t('onboarding.returningUser.title')}
        </h1>
        <p className="font-neo-body text-neo-white/70 text-lg max-w-xs">
          {t('onboarding.returningUser.subtitle')}
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col w-full max-w-xs gap-3"
      >
        <button
          onClick={onHaveAccount}
          className="w-full py-4 px-6 bg-neo-lime text-neo-navy font-neo-display text-xl uppercase tracking-wide border-neo-thick border-black rounded-neo shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed transition-all animate-neo-press"
        >
          {t('onboarding.returningUser.haveAccount')}
        </button>

        <button
          onClick={onNew}
          className="w-full py-4 px-6 bg-neo-cyan text-neo-navy font-neo-display text-xl uppercase tracking-wide border-neo-thick border-black rounded-neo shadow-hard hover:shadow-hard-pressed active:shadow-hard-pressed transition-all animate-neo-press"
        >
          {t('onboarding.returningUser.newHere')}
        </button>

        <button
          onClick={handleSkip}
          className="w-full py-3 px-6 bg-transparent text-neo-white/50 font-neo-body text-base border-neo border-neo-white/20 rounded-neo hover:text-neo-white/70 hover:border-neo-white/40 transition-all"
        >
          {t('onboarding.returningUser.skip')}
        </button>
      </motion.div>
    </div>
  );
};

export default ReturningUserStep;
