'use client';

/**
 * WordOfTheDay — decorative vocab card with staggered character entrance
 *
 * Neo-brutalist card showing a vocabulary word with definition.
 * Characters animate in one-by-one via framer-motion stagger.
 */

import { m, useReducedMotion } from 'framer-motion';
import { Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface WordOfTheDayProps {
  word: string;
  definition?: string;
  className?: string;
}

const CHAR_VARIANTS = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const CONTAINER_VARIANTS = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

export function WordOfTheDay({ word, definition, className = '' }: WordOfTheDayProps) {
  const { t } = useLanguage();
  const shouldReduceMotion = useReducedMotion();

  return (
    <div
      data-testid="wotd-card"
      className={`border-neo shadow-hard-sm rounded-neo bg-neo-navy p-4 ${className}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Star className="w-4 h-4 text-neo-lime" />
        <span className="text-xs font-neo-body text-neo-lime uppercase tracking-wide">
          {t('education.wordOfTheDay.title')}
        </span>
      </div>

      <m.div
        data-testid="wotd-word"
        className="text-xl font-neo-display text-neo-white mb-1"
        variants={shouldReduceMotion ? undefined : CONTAINER_VARIANTS}
        initial={shouldReduceMotion ? undefined : 'hidden'}
        animate={shouldReduceMotion ? undefined : 'visible'}
      >
        {word.split('').map((char, i) => (
          <m.span
            key={`${char}-${i}`}
            variants={shouldReduceMotion ? undefined : CHAR_VARIANTS}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            {char}
          </m.span>
        ))}
      </m.div>

      {definition && (
        <p data-testid="wotd-definition" className="text-sm text-neo-white font-neo-body">
          {definition}
        </p>
      )}
    </div>
  );
}
