'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { m, AnimatePresence } from 'framer-motion';
import { Grid3X3, Zap, Crosshair, Disc3, Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useAutoAdvanceStep } from '../../hooks/useAutoAdvanceStep';
import { useShouldReduceMotion } from '@/contexts/AccessibilityContext';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { Language } from '@/shared/types/game';

interface GameInstructionsProps {
  selectedGameMode: GameModeOption;
  t: (path: string, params?: Record<string, string | number>) => string;
  defaultOpen?: boolean;
  lang?: Language;
}

const STEP_IMAGE_KEYS: Record<string, string> = {
  'help.swipeLetters': 'swipe-letters',
  'help.diagonalWorks': 'diagonal-works',
  'help.comboExplanation': 'combo-bonus',
  'howToPlay.steps.scoring.description': 'scoring',
  'gameModes.blast.description': 'blast-mode',
  'gameModes.wordHunt.description': 'word-hunt-targets',
  'gameModes.wheelRush.description': 'wheel-spell',
};

const SUPPORTED_IMAGE_LANGS = new Set<Language>(['en', 'he', 'sv', 'ja', 'es']);

function stepImageSrc(lang: Language, descKey: string): string | null {
  const concept = STEP_IMAGE_KEYS[descKey];
  if (!concept) return null;
  const safeLang = SUPPORTED_IMAGE_LANGS.has(lang) ? lang : 'en';
  return `/multiplayer/how-to-play/${safeLang}/${concept}.jpg`;
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
  'wheel-rush': {
    icon: <Disc3 className="w-4 h-4" />,
    barClass: 'bg-neo-lime', iconBgClass: 'bg-neo-lime', dotClass: 'bg-neo-lime',
    steps: [
      { titleKey: 'gameModes.wheelRush.name', descKey: 'gameModes.wheelRush.description' },
      { titleKey: 'howToPlay.steps.scoring.title', descKey: 'howToPlay.steps.scoring.description' },
      { titleKey: 'howToPlay.comboBonus', descKey: 'help.comboExplanation' },
    ],
  },
};

export function GameInstructions({ selectedGameMode, t, defaultOpen: _defaultOpen = true, lang = 'en' }: GameInstructionsProps): React.ReactElement | null {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const reduceMotion = useShouldReduceMotion();

  const config = GAME_INSTRUCTIONS[selectedGameMode];
  const stepCount = config?.steps.length ?? 0;
  // Auto-advance slides; pause on hover/keyboard-focus, and disable for reduced-motion.
  const [instructionStep, setInstructionStep] = useAutoAdvanceStep({
    count: stepCount,
    paused: hovered || focused || reduceMotion,
    resetKey: selectedGameMode,
  });

  if (!config) return null;
  const { icon, barClass, iconBgClass, dotClass, steps } = config;
  const step = steps[instructionStep] ?? steps[0];

  return (
    <m.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 24 }}
      className="rounded-neo-lg border-3 border-neo-black bg-neo-navy-light shadow-hard overflow-hidden"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFocused(false); }}
    >
      <div className={cn('h-1', barClass)} />
      <div className="w-full p-2.5 flex items-center gap-2">
        <div className={cn('w-6 h-6 rounded-full border-2 border-neo-black flex items-center justify-center shadow-hard-sm text-neo-black shrink-0', iconBgClass)}>
          {icon}
        </div>
        <h3 className="text-sm font-black uppercase text-neo-cream flex items-center gap-1.5 flex-1 text-start">
          <Lightbulb className="w-3.5 h-3.5 text-neo-yellow" />
          {t('help.howToPlay')}
        </h3>
      </div>
      <div className="px-3 pb-3">
        <AnimatePresence mode="wait">
          <m.div
            key={instructionStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="text-sm text-slate-300"
          >
            {(() => {
              const src = stepImageSrc(lang, step.descKey);
              return src ? (
                <div className="relative mb-2.5 rounded-neo border-2 border-neo-black overflow-hidden shadow-hard-sm aspect-[4/3] bg-neo-navy">
                  <Image
                    src={src}
                    alt={t(step.titleKey)}
                    fill
                    sizes="(max-width: 768px) 90vw, 400px"
                    className="object-cover"
                  />
                </div>
              ) : null;
            })()}
            <div className="min-h-[48px] flex items-start gap-2">
              <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', dotClass)} />
              <div>
                <p className="font-bold text-neo-cream text-xs uppercase mb-0.5">{t(step.titleKey)}</p>
                <p>{t(step.descKey)}</p>
              </div>
            </div>
          </m.div>
        </AnimatePresence>
        <div className="flex items-center justify-center gap-2 mt-3" role="group">
          <button
            onClick={(e) => { e.stopPropagation(); setInstructionStep(Math.max(0, instructionStep - 1)); }}
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
            onClick={(e) => { e.stopPropagation(); setInstructionStep(Math.min(steps.length - 1, instructionStep + 1)); }}
            disabled={instructionStep === steps.length - 1}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-neo bg-neo-white/10 disabled:opacity-30 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan"
            aria-label={t('common.next')}
          >
            <ChevronRight className="w-5 h-5 text-neo-cream rtl:rotate-180" />
          </button>
        </div>
      </div>
    </m.div>
  );
}
