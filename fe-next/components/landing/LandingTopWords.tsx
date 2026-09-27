'use client';

import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface LandingTopWordsProps {
  words?: { word: string; score: number }[];
}

const tileVariants = {
  hidden: { opacity: 0, y: 30, rotateX: -90 },
  visible: (i: number) => ({
    opacity: 1, y: 0, rotateX: 0,
    transition: { type: 'spring' as const, stiffness: 400, damping: 15, delay: i * 0.04 },
  }),
};

export function LandingTopWords({ words }: LandingTopWordsProps) {
  const { t } = useLanguage();

  // Only show when we have real data — no fake placeholders
  if (!words || words.length === 0) return null;

  const displayWords = words;

  return (
    <div className="w-full max-w-4xl mx-auto xl:max-w-5xl">
      <h3 className="font-black text-neo-white uppercase text-xs sm:text-sm text-center mb-3">
        {t('landing.todaysTopWords')}
      </h3>

      <div className="flex gap-3 sm:gap-4 md:gap-5 lg:gap-6 overflow-x-auto pb-2 px-2 snap-x snap-mandatory scrollbar-hide justify-center">
        {displayWords.map((entry, wi) => (
          <m.div
            key={entry.word}
            className="flex items-center gap-0.5 snap-center shrink-0"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {entry.word.split('').map((letter, li) => (
              <m.div
                key={li}
                custom={wi * entry.word.length + li}
                variants={tileVariants}
                whileHover={{ y: -4, scale: 1.15, transition: { type: 'spring', stiffness: 500, damping: 10 } }}
                className={cn(
                  'w-7 h-8 sm:w-8 sm:h-9 md:w-9 md:h-10 lg:w-10 lg:h-11',
                  'bg-neo-navy border-2 border-neo-black shadow-hard-sm rounded-sm',
                  'flex items-center justify-center cursor-default',
                  'font-black text-neo-white text-sm sm:text-base md:text-lg lg:text-xl',
                  'select-none'
                )}
                style={{ perspective: 600 }}
              >
                {letter}
              </m.div>
            ))}
            <m.div
              initial={{ opacity: 0, scale: 0, rotate: -20 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 3 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.3 + wi * 0.15 }}
              className={cn(
                'ms-1 px-2 py-0.5',
                'bg-neo-lime border-2 border-neo-black rounded-neo shadow-hard-sm',
                'font-black text-neo-black text-xs'
              )}
            >
              {entry.score}
            </m.div>
          </m.div>
        ))}
      </div>
    </div>
  );
}
