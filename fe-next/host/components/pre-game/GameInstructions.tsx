'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Grid3X3, Zap, Crosshair, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import type { GameModeOption } from '@/components/GameModeSelector';

interface GameInstructionsProps {
  selectedGameMode: GameModeOption;
  t: (path: string, params?: Record<string, string | number>) => string;
  defaultOpen?: boolean;
}

const GAME_INSTRUCTIONS: Record<string, { icon: React.ReactNode; barClass: string; iconBgClass: string; dotClass: string; steps: { titleKey: string; descKey: string }[] }> = {
  random: {
    icon: <Grid3X3 className="w-4 h-4" />,
    barClass: 'bg-neo-purple', iconBgClass: 'bg-neo-purple', dotClass: 'bg-neo-purple',
    steps: [
      { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
      { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
      { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
    ],
  },
  classic: {
    icon: <Grid3X3 className="w-4 h-4" />,
    barClass: 'bg-neo-cyan', iconBgClass: 'bg-neo-cyan', dotClass: 'bg-neo-cyan',
    steps: [
      { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
      { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
      { titleKey: 'howToPlay.steps.scoring.title', descKey: 'howToPlay.steps.scoring.description' },
    ],
  },
  blast: {
    icon: <Zap className="w-4 h-4" />,
    barClass: 'bg-neo-pink', iconBgClass: 'bg-neo-pink', dotClass: 'bg-neo-pink',
    steps: [
      { titleKey: 'gameModes.blast.name', descKey: 'gameModes.blast.description' },
      { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
      { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
    ],
  },
  'word-hunt': {
    icon: <Crosshair className="w-4 h-4" />,
    barClass: 'bg-neo-lime', iconBgClass: 'bg-neo-lime', dotClass: 'bg-neo-lime',
    steps: [
      { titleKey: 'gameModes.wordHunt.name', descKey: 'gameModes.wordHunt.description' },
      { titleKey: 'howToPlay.steps.basics.title', descKey: 'help.swipeLetters' },
      { titleKey: 'howToPlay.steps.grid.title', descKey: 'help.diagonalWorks' },
    ],
  },
};

export function GameInstructions({ selectedGameMode, t, defaultOpen = true }: GameInstructionsProps): React.ReactElement | null {
  const [instructionStep, setInstructionStep] = useState(0);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => { setInstructionStep(0); }, [selectedGameMode]);

  const config = GAME_INSTRUCTIONS[selectedGameMode];
  if (!config) return null;
  const { icon, barClass, iconBgClass, dotClass, steps } = config;
  const step = steps[instructionStep] ?? steps[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light shadow-hard overflow-hidden"
    >
      <div className={cn('h-1', barClass)} />
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="w-full p-2.5 flex items-center gap-2"
      >
        <div className={cn('w-6 h-6 rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm text-neo-black shrink-0', iconBgClass)}>
          {icon}
        </div>
        <h3 className="text-sm font-black uppercase text-neo-cream flex items-center gap-1.5 flex-1 text-start">
          <Lightbulb className="w-3.5 h-3.5 text-neo-yellow" />
          {t('help.howToPlay')}
        </h3>
        <ChevronRight className={cn('w-4 h-4 text-neo-cream/50 transition-transform', isOpen && 'rotate-90')} />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3">
              <AnimatePresence mode="wait">
                <motion.div
                  key={instructionStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="min-h-[48px] flex items-start gap-2 text-sm text-slate-300"
                >
                  <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
                  <div>
                    <p className="font-bold text-neo-cream text-xs uppercase mb-0.5">{t(step.titleKey)}</p>
                    <p>{t(step.descKey)}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
              <div className="flex items-center justify-center gap-2 mt-3" role="group">
                <button
                  onClick={(e) => { e.stopPropagation(); setInstructionStep(s => Math.max(0, s - 1)); }}
                  disabled={instructionStep === 0}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-neo bg-neo-white/10 disabled:opacity-30 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
                  aria-label={t('common.previous')}
                >
                  <ChevronLeft className="w-5 h-5 text-neo-cream rtl:rotate-180" />
                </button>
                <div className="flex gap-0.5" role="tablist">
                  {steps.map((step, i) => {
                    const isActive = i === instructionStep;
                    return (
                      <button
                        key={step.titleKey}
                        onClick={(e) => { e.stopPropagation(); setInstructionStep(i); }}
                        role="tab"
                        aria-selected={isActive}
                        aria-current={isActive ? 'step' : undefined}
                        aria-label={t('common.stepOf', { current: i + 1, total: steps.length })}
                        className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-neo focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full transition-colors', isActive ? dotClass : 'bg-neo-white/20')} aria-hidden="true" />
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setInstructionStep(s => Math.min(steps.length - 1, s + 1)); }}
                  disabled={instructionStep === steps.length - 1}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-neo bg-neo-white/10 disabled:opacity-30 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
                  aria-label={t('common.next')}
                >
                  <ChevronRight className="w-5 h-5 text-neo-cream rtl:rotate-180" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
