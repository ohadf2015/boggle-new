'use client';

import { memo } from 'react';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { SNAPPY } from '@/lib/adventure/springPhysics';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface MechanicIndicatorProps {
  /** Active world mechanic key (null for World 1) */
  mechanic: string | null;
  /** Number of times the player triggered the mechanic this level */
  hitCount: number;
  /** World number for theming */
  worldNumber: number;
  className?: string;
}

const MechanicIndicator = memo(function MechanicIndicator({
  mechanic,
  hitCount,
  worldNumber,
  className,
}: MechanicIndicatorProps) {
  const { t } = useLanguage();

  if (!mechanic) return null;

  return (
    <div
      data-testid="mechanic-indicator"
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-neo border-neo',
        'bg-neo-purple/20 border-neo-purple/40',
        'text-xs',
        className
      )}
    >
      <Sparkles className="w-3.5 h-3.5 text-neo-purple-light shrink-0" />
      <span className="font-bold text-neo-purple-light truncate">
        {t(`adventure.mechanic.${mechanic}`)}
      </span>
      <span className="text-neo-white truncate">
        {t(`adventure.mechanics.${mechanic}`)}
      </span>
      {hitCount > 0 && (
        <AdaptiveMotion.span
          className={cn(
            'font-black ms-auto',
            hitCount >= 3 ? 'text-neo-pink' : hitCount >= 2 ? 'text-neo-cyan' : 'text-neo-lime'
          )}
          initial={{ scale: 1.4 }}
          animate={{ scale: 1 }}
          transition={SNAPPY}
          key={hitCount}
        >
          ×{hitCount}{hitCount >= 2 && ' STREAK'}
        </AdaptiveMotion.span>
      )}
    </div>
  );
});

export default MechanicIndicator;
