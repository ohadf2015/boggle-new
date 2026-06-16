'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { NeoPanel } from '@/components/ui/panel';

interface Props {
  open: boolean;
  score: number;
  onContinue: () => void;
  onSkip: () => void;
}

export default function PracticeContinuePrompt({
  open,
  score,
  onContinue,
  onSkip,
}: Props): React.ReactElement | null {
  const { t } = useLanguage();

  return (
    <AnimatePresence>
      {open && (
        <m.div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-neo-black/60 px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="practice-continue-title"
        >
          <NeoPanel asChild tone="cream" className="p-5 lg:p-6 max-w-sm w-full flex flex-col items-center gap-3">
          <m.div
            initial={{ scale: 0.9, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 24 }}
          >
            <Mascot variant="celebration" size="md" />
            <h2
              id="practice-continue-title"
              className="font-neo-display font-black text-neo-black text-2xl text-center"
            >
              {t('practiceContinue.title', { score })}
            </h2>
            <p className="text-neo-black text-sm text-center">
              {t('practiceContinue.body')}
            </p>
            <button
              type="button"
              onClick={onContinue}
              className="w-full bg-neo-lime text-neo-black border-3 border-neo-black rounded-neo py-3 font-black text-lg shadow-hard active:shadow-hard-pressed active:translate-x-[1px] active:translate-y-[1px]"
            >
              {t('practiceContinue.continue')}
            </button>
            <button
              type="button"
              onClick={onSkip}
              className="text-neo-black/70 text-sm underline underline-offset-2 hover:text-neo-black"
            >
              {t('practiceContinue.skip')}
            </button>
          </m.div>
          </NeoPanel>
        </m.div>
      )}
    </AnimatePresence>
  );
}
