'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { m } from 'framer-motion';
import { Pointer } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import MiniGrid from './MiniGrid';
import { demoConfigs } from './demoConfigs';

interface WelcomeDemoStepProps {
  onDemoComplete: () => void;
  demoCompleted: boolean;
}

/**
 * WelcomeDemoStep - Fast onboarding: fun in 15 seconds
 * Phase 1 (0-2s): Auto-trace shows how to form a word
 * Phase 2 (2-7s): Player traces ONE word
 * Phase 3 (on success): Celebration + "Let's Play!" button
 */
const WelcomeDemoStep: React.FC<WelcomeDemoStepProps> = ({
  onDemoComplete,
  demoCompleted,
}) => {
  const { t, language } = useLanguage();
  const [autoTracing, setAutoTracing] = useState(true);

  const demoConfig = useMemo(() => {
    return demoConfigs[language] || demoConfigs.en;
  }, [language]);

  const handleAutoTraceComplete = useCallback(() => {
    setAutoTracing(false);
  }, []);

  return (
    <div className="flex flex-col items-center space-y-3 sm:space-y-5">
      {/* Compact welcome header */}
      <m.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 26 }}
        className="text-center space-y-1"
      >
        <div className="flex justify-center mb-1">
          <Mascot variant="waving" size="sm" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-neo-white uppercase">
          {t('onboarding.welcome.title')}
        </h2>
      </m.div>

      {/* Phase indicator */}
      {!demoCompleted && (
        <m.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 26 }}
          className="bg-neo-lime border-3 border-neo-black rounded-neo p-2.5 sm:p-4 shadow-hard-md max-w-sm text-center"
        >
          {autoTracing ? (
            <span className="font-bold text-neo-black text-xs sm:text-sm">
              {t('onboarding.welcome.watchMe', 'Watch this!')}
            </span>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-1">
                <Pointer className="text-xl text-neo-black animate-bounce" />
                <span className="font-bold text-neo-black text-xs sm:text-sm">
                  {t('onboarding.welcome.yourTurn', 'Your turn! Spell:')}
                </span>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-neo-black">
                {t('onboarding.welcome.demoWord')}
              </div>
            </>
          )}
        </m.div>
      )}

      {/* Interactive demo grid */}
      <m.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 280, damping: 26 }}
        className="w-full"
      >
        <MiniGrid
          size={3}
          letters={demoConfig.letters}
          demoWord={demoConfig.word}
          demoPath={demoConfig.path}
          onDemoComplete={onDemoComplete}
          showHints={!autoTracing}
          autoTrace={autoTracing}
          onAutoTraceComplete={handleAutoTraceComplete}
        />
      </m.div>

      {/* Celebration — auto-proceed after brief delay */}
      {demoCompleted && (
        <m.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          onAnimationComplete={() => {
            setTimeout(onDemoComplete, 800);
          }}
          data-testid="lets-play-button"
        />
      )}

      {/* Skip button - always visible */}
      {!demoCompleted && (
        <m.button
          data-testid="skip-button"
          onClick={onDemoComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 1 }}
          className="text-neo-white text-xs underline hover:text-neo-white transition-colors"
        >
          {t('onboarding.skip')}
        </m.button>
      )}
    </div>
  );
};

export default WelcomeDemoStep;
