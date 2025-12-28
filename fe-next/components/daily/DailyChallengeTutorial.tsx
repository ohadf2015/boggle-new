'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, Check, Heart, Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface DailyChallengeTutorialProps {
  onComplete: () => void;
  onSkip: () => void;
}

const TOTAL_STEPS = 4;

export const DailyChallengeTutorial: React.FC<DailyChallengeTutorialProps> = ({
  onComplete,
  onSkip,
}) => {
  const { t } = useLanguage();
  const [currentStep, setCurrentStep] = useState(1);

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Welcome onNext={nextStep} />;
      case 2:
        return <Step2WordDiscovery onNext={nextStep} onPrev={prevStep} />;
      case 3:
        return <Step3MinimumLength onNext={nextStep} onPrev={prevStep} />;
      case 4:
        return <Step4Summary onNext={onComplete} onPrev={prevStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-neo-navy rounded-neo border-4 border-neo-black max-w-lg w-full p-6 shadow-neo-brutalist relative"
      >
        {/* Close button */}
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-2 rounded-full transition-all',
                i + 1 === currentStep
                  ? 'w-8 bg-neo-purple'
                  : i + 1 < currentStep
                  ? 'w-2 bg-neo-purple'
                  : 'w-2 bg-gray-300 dark:bg-gray-600'
              )}
            />
          ))}
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// Step 1: Welcome
const Step1Welcome: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  const { t } = useLanguage();

  return (
    <div className="text-center">
      <div className="text-6xl mb-4">🎯</div>
      <h2 className="text-3xl font-black mb-4">{t('tutorial.wordHunt.welcome.title') || 'Daily Word Hunt'}</h2>
      <p className="text-lg mb-6">
        {t('tutorial.wordHunt.welcome.description') || 'Find the hidden word! You have 10 attempts.'}
      </p>
      <Button onClick={onNext} className="w-full bg-neo-purple text-white">
        {t('tutorial.wordHunt.welcome.next') || 'Next'} <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
};

// Step 2: Word Discovery & Life System
const Step2WordDiscovery: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <h2 className="text-2xl font-black mb-4">{t('tutorial.wordHunt.lifeSystem.title') || 'Life & Word Discovery'}</h2>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        {t('tutorial.wordHunt.lifeSystem.description') || 'Find words on the board to gain life & clue tokens!'}
      </p>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-neo border-2 border-neo-black p-4 mb-4">
        {/* Life bar example */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Life Bar</div>
          <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden border-2 border-neo-black">
            <div className="h-full bg-green-500 flex items-center justify-center text-xs font-bold text-white" style={{ width: '85%' }}>
              <Heart className="w-3 h-3 mr-1 fill-current" />
              85/100
            </div>
          </div>
        </div>

        {/* Tokens example */}
        <div className="mb-3">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Clue Tokens</div>
          <div className="flex items-center gap-1 px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 border-2 border-neo-black rounded-neo inline-flex">
            <Coins className="w-4 h-4 text-yellow-600" />
            <span className="font-bold text-sm">12</span>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded p-3">
          <div className="text-sm font-bold mb-1">✓ Word found!</div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            {t('tutorial.wordHunt.lifeSystem.swipeToGain') || 'Swipe words to gain'} +15 ❤️ +2 🪙
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onPrev} variant="outline" className="flex-1">
          ← {t('common.back') || 'Back'}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-neo-purple text-white">
          {t('tutorial.wordHunt.lifeSystem.tryIt') || 'Got it!'} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Step 3: Minimum Length Rule
const Step3MinimumLength: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="text-center mb-4">
        <motion.div
          className="text-8xl font-black text-neo-purple inline-block"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
        >
          4
        </motion.div>
      </div>

      <h2 className="text-2xl font-black mb-4 text-center">
        {t('tutorial.wordHunt.minLength.title') || '⚠️ IMPORTANT RULE'}
      </h2>
      <p className="text-lg mb-6 text-center font-bold">
        {t('tutorial.wordHunt.minLength.description') || 'Words must be at least 4 LETTERS long'}
      </p>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-neo border-2 border-neo-black p-4 mb-6 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold">BIRD</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('tutorial.wordHunt.minLength.example1') || '4 letters ✓'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-bold line-through">CAT</div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('tutorial.wordHunt.minLength.example2') || '3 letters - too short!'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={onPrev} variant="outline" className="flex-1">
          ← {t('common.back') || 'Back'}
        </Button>
        <Button onClick={onNext} className="flex-1 bg-neo-purple text-white">
          {t('tutorial.wordHunt.minLength.gotIt') || 'Got it!'} <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

// Step 4: Summary & Start
const Step4Summary: React.FC<{ onNext: () => void; onPrev: () => void }> = ({
  onNext,
  onPrev,
}) => {
  const { t } = useLanguage();

  return (
    <div>
      <div className="text-center mb-4">
        <div className="text-6xl mb-2">🎉</div>
        <h2 className="text-3xl font-black mb-4">{t('tutorial.wordHunt.complete.title') || 'You\'re ready!'}</h2>
      </div>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-neo border-2 border-neo-black p-4 mb-6">
        <div className="font-bold mb-3">{t('tutorial.wordHunt.complete.remember') || 'Remember:'}</div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-neo-purple font-bold">•</span>
            <span>{t('tutorial.wordHunt.complete.rule1') || '10 attempts to find target'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neo-purple font-bold">•</span>
            <span>{t('tutorial.wordHunt.complete.rule2') || 'Find other words for life'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neo-purple font-bold">•</span>
            <span>{t('tutorial.wordHunt.complete.rule3') || '4+ letters minimum'}</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-neo-purple font-bold">•</span>
            <span>{t('tutorial.wordHunt.complete.rule4') || 'Same puzzle worldwide'}</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col gap-2">
        <Button onClick={onNext} className="w-full bg-neo-purple text-white text-lg py-6">
          {t('tutorial.wordHunt.complete.start') || 'Start Daily Challenge'} 🚀
        </Button>
        <Button onClick={onPrev} variant="outline" size="sm">
          ← {t('common.back') || 'Back'}
        </Button>
      </div>
    </div>
  );
};
