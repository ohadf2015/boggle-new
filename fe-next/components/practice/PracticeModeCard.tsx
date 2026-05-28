'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import type { KeyboardEvent } from 'react';
import type { PracticeMode } from '@/lib/practice/practiceTutorialSteps';

interface PracticeModeCardProps {
  mode: {
    id: PracticeMode;
    titleKey: string;
    descKey: string;
    color: string;
    emoji: string;
  };
  isCompleted: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  locale: string;
}

const MODE_ACCENT: Record<string, string> = {
  classic: 'border-neo-cyan/80 hover:border-neo-cyan',
  wordHunt: 'border-neo-lime/80 hover:border-neo-lime',
  wheelRush: 'border-neo-purple/80 hover:border-neo-purple',
};

const MODE_BORDER_COLOR: Record<string, string> = {
  classic: 'border-l-neo-cyan',
  wordHunt: 'border-l-neo-lime',
  wheelRush: 'border-l-neo-purple',
};

export default function PracticeModeCard({
  mode,
  isCompleted,
  isCurrent,
  onSelect,
  locale,
}: PracticeModeCardProps) {
  const { t } = useLanguage();

  return (
    <AdaptiveMotion.button
      data-testid="mode-card"
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.3 }}
      className={`relative flex flex-col gap-2 rounded-neo border-2 border-l-4 ${MODE_ACCENT[mode.id]} ${MODE_BORDER_COLOR[mode.id]} p-4 transition-all shadow-hard hover:shadow-hard-lg active:shadow-hard-sm bg-neo-navy/50`}
    >
      {/* Stars or Completed badge */}
      <div className="absolute top-2 end-2">
        {isCompleted ? (
          <AdaptiveMotion.span
            aria-hidden
            animate={{ rotate: [0, -8, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 2.4, ease: 'easeInOut' }}
            className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-neo-yellow text-neo-navy border-2 border-neo-black font-neo-display font-black text-xs shadow-hard-sm"
          >
            ✓
          </AdaptiveMotion.span>
        ) : (
          <span className="text-xs font-neo-display font-black text-neo-yellow">★★★</span>
        )}
      </div>

      {/* Mode emoji + title */}
      <div className="flex items-start gap-2">
        <span aria-hidden className="text-lg leading-none mt-0.5">
          {mode.emoji}
        </span>
        <h2 className="text-base sm:text-lg font-neo-display font-black text-neo-white flex-1 text-start">
          {t(mode.titleKey)}
        </h2>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm font-neo-body text-neo-white text-start line-clamp-2">
        {t(mode.descKey)}
      </p>

      {/* Difficulty indicator */}
      <div className="flex gap-1 mt-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 w-full rounded-full ${isCompleted ? 'bg-neo-yellow' : 'bg-neo-cream/30'}`}
          />
        ))}
      </div>
    </AdaptiveMotion.button>
  );
}
