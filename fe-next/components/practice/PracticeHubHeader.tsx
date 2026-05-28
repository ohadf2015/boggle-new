'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

interface PracticeHubHeaderProps {
  completedCount: number;
  totalCount: number;
}

export default function PracticeHubHeader({ completedCount, totalCount }: PracticeHubHeaderProps) {
  const { t } = useLanguage();

  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <AdaptiveMotion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      className="relative mb-6"
    >
      <div className="text-center mb-4">
        <h1 className="text-3xl sm:text-4xl font-neo-display font-black text-neo-white">
          {t('practice.hub.title')}
        </h1>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-neo-display font-bold text-neo-white uppercase tracking-wider">
            {t('practice.hub.progress', { count: completedCount, total: totalCount })}
          </span>
        </div>
        <div className="w-full h-3 bg-neo-navy border-2 border-neo-black rounded-full overflow-hidden shadow-hard">
          <div
            data-testid="progress-fill"
            className="h-full bg-neo-lime transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </AdaptiveMotion.div>
  );
}
