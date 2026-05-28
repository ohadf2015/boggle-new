'use client';

/**
 * QuestCard — RPG-style quest card with progress ring, description,
 * reward preview, and action button.
 *
 * Enhanced RPG aesthetic: bigger icons in colored circles, star XP badges,
 * tactile GO buttons. Dark indigo card backgrounds with colored accents.
 */

import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { QuestProgressRing } from './QuestProgressRing';

interface QuestCardProps {
  icon: React.ElementType;
  nameKey: string;
  descKey: string;
  completed: boolean;
  href: string;
  accentColor: string;
  ringColor: string;
  iconColorClass: string;
  xpReward?: number;
}

export function QuestCard({
  icon: Icon,
  nameKey,
  descKey,
  completed,
  href,
  accentColor,
  ringColor,
  iconColorClass,
  xpReward = 50,
}: QuestCardProps) {
  const { t, language } = useLanguage();

  return (
    <Link
      href={`/${language}${href}`}
      className={cn(
        'group relative flex items-center gap-3 p-3.5 sm:p-4',
        'rounded-neo-lg border-3 border-neo-black',
        'bg-neo-navy-light',
        'shadow-hard-sm',
        'transition-all duration-200',
        'hover:-translate-y-1 hover:shadow-hard',
        'active:translate-y-px active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan',
        completed && 'opacity-80',
      )}
      aria-label={`${t(nameKey)}${completed ? ` - ${t('quests.done')}` : ''}`}
    >
      {/* Colored accent strip */}
      <div
        className={cn(
          'absolute inset-y-0 inset-s-0 w-1.5 rounded-s-neo-lg',
          accentColor,
          completed && 'opacity-50',
        )}
        aria-hidden="true"
      />

      {/* Progress ring with icon in colored circle */}
      <div className="shrink-0 ms-1">
        <QuestProgressRing
          progress={completed ? 1 : 0}
          size={56}
          strokeWidth={4}
          color={completed ? 'stroke-neo-lime' : ringColor}
        >
          {completed ? (
            <AdaptiveMotion.div
              className="w-8 h-8 rounded-full bg-neo-lime flex items-center justify-center border-2 border-neo-black"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 12 }}
            >
              <Check className="w-5 h-5 text-neo-black" aria-hidden="true" />
            </AdaptiveMotion.div>
          ) : (
            <div
              className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center',
                'border-2 border-neo-black',
                accentColor,
              )}
            >
              <Icon className="w-5 h-5 text-neo-black" aria-hidden="true" />
            </div>
          )}
        </QuestProgressRing>
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            'font-neo-display text-sm font-bold leading-tight',
            completed ? 'text-neo-white line-through' : 'text-neo-white',
          )}
        >
          {t(nameKey)}
        </p>
        <p
          className={cn(
            'font-neo-body text-xs mt-0.5 leading-snug',
            completed ? 'text-neo-white' : 'text-neo-white',
          )}
        >
          {t(descKey)}
        </p>
        {/* XP reward badge */}
        <span
          className={cn(
            'inline-flex items-center gap-1 mt-1.5',
            'text-[11px] font-black uppercase tracking-wide',
            completed ? 'text-neo-lime/40' : iconColorClass,
          )}
        >
          <Star className="w-3 h-3" aria-hidden="true" />
          {t('quests.reward.xp', { xp: xpReward })}
        </span>
      </div>

      {/* Action badge */}
      <div className="shrink-0">
        {completed ? (
          <span
            className={cn(
              'inline-flex items-center px-3 py-1.5',
              'rounded-neo border-2 border-neo-lime/30',
              'bg-neo-lime/15 text-neo-lime',
              'font-neo-display text-xs font-black uppercase',
            )}
          >
            {t('quests.done')}
          </span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center px-4 py-2',
              'rounded-neo border-2 border-neo-black',
              accentColor,
              'text-neo-black',
              'font-neo-display text-sm font-black uppercase',
              'shadow-hard-sm',
              'group-hover:shadow-hard group-hover:-translate-y-px',
              'transition-all duration-100',
            )}
          >
            {t('quests.go')}
          </span>
        )}
      </div>
    </Link>
  );
}
