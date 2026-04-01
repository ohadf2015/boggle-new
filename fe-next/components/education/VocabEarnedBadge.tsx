'use client';

import { motion } from 'framer-motion';
import { Compass, Crown, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface VocabEarnedBadgeProps {
  type: 'explorer' | 'master' | 'speed';
  unlocked: boolean;
  className?: string;
}

const BADGE_CONFIG = {
  explorer: {
    icon: Compass,
    color: 'bg-neo-cyan',
    labelKey: 'education.badges.wordExplorer',
  },
  master: {
    icon: Crown,
    color: 'bg-neo-lime',
    labelKey: 'education.badges.vocabMaster',
  },
  speed: {
    icon: Zap,
    color: 'bg-neo-pink',
    labelKey: 'education.badges.speedScholar',
  },
} as const;

export function VocabEarnedBadge({ type, unlocked, className = '' }: VocabEarnedBadgeProps) {
  const { t } = useLanguage();
  const { icon: Icon, color, labelKey } = BADGE_CONFIG[type];

  return (
    <motion.div
      data-testid="vocab-badge"
      initial={unlocked ? { scale: 0 } : false}
      animate={unlocked ? { scale: 1 } : undefined}
      transition={unlocked ? { type: 'spring', stiffness: 300, damping: 15 } : undefined}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-neo border-2 border-black shadow-hard-sm font-neo-body text-sm ${
        unlocked ? `${color} text-black` : 'bg-neo-navy/50 opacity-50 grayscale text-neo-cream'
      } ${className}`}
    >
      <Icon size={16} />
      <span>{unlocked ? t(labelKey) : t('education.badges.locked')}</span>
    </motion.div>
  );
}

interface VocabBadgeRowProps {
  wordsFound: number;
  totalWords: number;
  earlyWordsCount: number;
}

export function VocabBadgeRow({ wordsFound, totalWords, earlyWordsCount }: VocabBadgeRowProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <VocabEarnedBadge type="explorer" unlocked={wordsFound >= 5} />
      <VocabEarnedBadge type="master" unlocked={wordsFound === totalWords && totalWords > 0} />
      <VocabEarnedBadge type="speed" unlocked={earlyWordsCount >= 3} />
    </div>
  );
}
