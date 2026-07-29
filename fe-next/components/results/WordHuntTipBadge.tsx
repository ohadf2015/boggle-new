'use client';

import { memo } from 'react';
import { Lightbulb } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getWordHuntTip, type WordHuntTipInput } from './getWordHuntTip';

interface WordHuntTipBadgeProps {
  stats: WordHuntTipInput;
}

/**
 * Compact tip badge shown per player in Word Hunt results.
 * Shows a single, personalized improvement tip based on performance.
 */
const WordHuntTipBadge: React.FC<WordHuntTipBadgeProps> = memo(({ stats }) => {
  const { t } = useLanguage();
  const tip = getWordHuntTip(stats);
  const tipText = t(tip.key, tip.params);

  if (!tipText) return null;

  return (
    <div
      data-testid="word-hunt-tip"
      className="flex items-start gap-1.5 mt-1 px-2 py-1 rounded-neo bg-neo-cyan/10 border border-neo-cyan/30"
    >
      <Lightbulb className="w-3 h-3 text-neo-cyan shrink-0 mt-0.5" />
      <span className="text-[9px] sm:text-[10px] text-neo-white leading-snug font-bold">
        {tipText}
      </span>
    </div>
  );
});

WordHuntTipBadge.displayName = 'WordHuntTipBadge';
export default WordHuntTipBadge;
