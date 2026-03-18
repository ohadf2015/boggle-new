'use client';

import { useState } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { Hand, Sparkles, Target, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { BlastCodexModal } from './BlastCodexModal';
import type { BlastComboType } from './utils/blastCombos';

interface BlastReadyScreenProps {
  onStart: () => void;
  discoveredCombos?: Set<BlastComboType>;
}

const STEPS = [
  {
    key: 'step1',
    Icon: Hand,
    bg: 'bg-neo-cyan/15',
    border: 'border-neo-cyan/40',
    iconColor: 'text-neo-cyan',
    titleKey: 'blast.ready.step1Title',
    descKey: 'blast.ready.step1Desc',
  },
  {
    key: 'step2',
    Icon: Sparkles,
    bg: 'bg-neo-orange/15',
    border: 'border-neo-orange/40',
    iconColor: 'text-neo-orange',
    titleKey: 'blast.ready.step2Title',
    descKey: 'blast.ready.step2Desc',
  },
  {
    key: 'step3',
    Icon: Target,
    bg: 'bg-neo-pink/15',
    border: 'border-neo-pink/40',
    iconColor: 'text-neo-pink',
    titleKey: 'blast.ready.step3Title',
    descKey: 'blast.ready.step3Desc',
  },
] as const;

export function BlastReadyScreen({ onStart, discoveredCombos }: BlastReadyScreenProps) {
  const { t } = useLanguage();
  const [isCodexOpen, setIsCodexOpen] = useState(false);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 gap-6">
      {/* Title */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="text-center"
      >
        <h1 className="text-5xl font-black uppercase text-white font-neo-display">
          {t('blast.ready.title')}
        </h1>
        <p className="text-sm font-bold text-white/70 mt-1">
          {t('blast.ready.subtitle')}
        </p>
      </AdaptiveMotion.div>

      {/* Infographic steps */}
      <div className="w-full max-w-sm lg:max-w-3xl xl:max-w-4xl lg:grid lg:grid-cols-3 lg:gap-4 space-y-3 lg:space-y-0">
        {STEPS.map((step, i) => (
          <AdaptiveMotion.div
            key={step.key}
            data-testid={`step-card-${step.key}`}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.1, type: 'spring', stiffness: 300, damping: 25 }}
            className={`flex items-center gap-4 px-4 py-3 lg:flex-col lg:items-start lg:gap-3 lg:py-5 rounded-neo border-3 ${step.border} ${step.bg}`}
          >
            <div className="shrink-0 flex items-center justify-center w-11 h-11 rounded-neo bg-white/10">
              <step.Icon className={`h-6 w-6 ${step.iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="font-black text-sm text-white uppercase tracking-wide">
                {t(step.titleKey)}
              </div>
              <div className="text-xs text-white/70 leading-snug mt-0.5">
                {t(step.descKey)}
              </div>
            </div>
          </AdaptiveMotion.div>
        ))}
      </div>

      {/* CTA */}
      <AdaptiveMotion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-sm lg:max-w-md space-y-3"
      >
        <Button
          data-testid="play-button"
          size="lg"
          onClick={() => onStart()}
          className="w-full min-h-[56px] font-black text-xl uppercase border-3 border-neo-black shadow-hard-lg bg-neo-yellow text-neo-black hover:bg-neo-yellow/90"
        >
          {t('blast.ready.play')}
        </Button>
        <button
          data-testid="codex-button"
          onClick={() => setIsCodexOpen(true)}
          className="flex items-center justify-center gap-2 w-full min-h-[44px] font-black text-sm uppercase border-3 border-white/30 shadow-hard-sm rounded-neo bg-neo-navy hover:bg-neo-navy/80 text-white/80 transition-colors"
        >
          <BookOpen className="h-4 w-4" />
          {t('blast.comboCodex')}
        </button>
      </AdaptiveMotion.div>

      <BlastCodexModal
        isOpen={isCodexOpen}
        onClose={() => setIsCodexOpen(false)}
        discoveredCombos={discoveredCombos ?? new Set()}
      />
    </div>
  );
}
