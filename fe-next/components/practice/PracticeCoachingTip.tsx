'use client';

import { Lightbulb, Flame, Zap, Trophy, type LucideIcon } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface PracticeCoachingTipProps {
  completedCount: number;
}

export default function PracticeCoachingTip({ completedCount }: PracticeCoachingTipProps) {
  const { t } = useLanguage();

  // Determine which tip to show based on completion
  let tipKey: string;
  let Icon: LucideIcon;

  switch (completedCount) {
    case 0:
      tipKey = 'practice.hub.tip.start';
      Icon = Lightbulb;
      break;
    case 1:
      tipKey = 'practice.hub.tip.one';
      Icon = Flame;
      break;
    case 2:
      tipKey = 'practice.hub.tip.two';
      Icon = Zap;
      break;
    default:
      tipKey = 'practice.hub.tip.done';
      Icon = Trophy;
  }

  return (
    <AdaptiveMotion.div
      data-testid="coaching-tip"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="mt-8 px-4 py-3 rounded-neo border-2 border-l-4 border-neo-lime border-l-neo-lime bg-neo-navy text-neo-cream font-neo-body text-sm shadow-hard"
    >
      <div className="flex gap-2 items-start">
        <Icon aria-hidden className="w-4 h-4 mt-0.5 shrink-0 text-neo-lime" strokeWidth={2.5} />
        <p className="flex-1">{t(tipKey)}</p>
      </div>
    </AdaptiveMotion.div>
  );
}
