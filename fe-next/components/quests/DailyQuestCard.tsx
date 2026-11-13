'use client';

import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { cn } from '@/lib/utils';
import type { QuestConditionType, QuestPublicMode } from '@/shared/dailyQuestPool';
import { getQuestArt } from './questArt';

interface DailyQuestCardProps {
  titleKey: string;
  descKey: string;
  href: string;
  completed: boolean;
  type: QuestConditionType;
  mode?: QuestPublicMode;
  xpReward: number;
  index: number;
}

const BOB_DELAY = ['', '[animation-delay:.45s]', '[animation-delay:.9s]'];

export function DailyQuestCard({ titleKey, descKey, href, completed, type, mode, xpReward, index }: DailyQuestCardProps) {
  const { t, language } = useLanguage();
  const { art, accent } = getQuestArt({ type, mode });
  const tilt = index % 2 === 0 ? '-rotate-6 rtl:rotate-6' : 'rotate-6 rtl:-rotate-6';

  return (
    <Link
      href={`/${language}${href}`}
      aria-label={`${t(titleKey)}${completed ? ` - ${t('quests.done')}` : ''}`}
      className={cn(
        'group relative flex items-center gap-3 overflow-hidden p-3 pe-3.5',
        'rounded-neo-lg border-3 bg-neo-navy-light shadow-hard-sm',
        'transition duration-200 hover:-translate-y-1 hover:shadow-hard',
        'active:translate-y-px active:shadow-hard-pressed',
        'focus-visible:outline-hidden focus-visible:ring-3 focus-visible:ring-neo-cyan',
        completed ? 'border-neo-lime' : 'border-neo-black',
      )}
    >
      <span className={cn('absolute inset-y-0 inset-s-0 w-24', completed ? 'bg-neo-lime/15' : accent.wash)} aria-hidden="true" />
      <span className={cn('absolute inset-y-0 inset-s-0 w-1.5', completed ? 'bg-neo-lime' : accent.bg)} aria-hidden="true" />

      <div className="relative ms-1 grid size-20 shrink-0 place-items-center">
        <div className={cn('transition-transform duration-300 ease-out group-hover:rotate-0 group-hover:scale-110', tilt)}>
          {/* eslint-disable-next-line @next/next/no-img-element -- 256px transparent sticker shown at a fixed size */}
          <img
            data-testid="quest-card-art"
            src={art}
            width={72}
            height={72}
            alt=""
            className={cn(
              'size-18 object-contain',
              'motion-safe:animate-[quest-bob_2.8s_ease-in-out_infinite]',
              BOB_DELAY[index % BOB_DELAY.length],
              'group-hover:[animation-delay:0s]',
              'motion-safe:group-hover:animate-[quest-wiggle_600ms_ease-in-out]',
            )}
          />
        </div>
        {completed && (
          <AdaptiveMotion.span
            data-testid="quest-card-check"
            className="absolute -top-0.5 -end-0.5 grid size-7 place-items-center rounded-full border-2 border-neo-black bg-neo-lime shadow-hard-sm"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 14, delay: 0.25 }}
            aria-hidden="true"
          >
            <Check className="size-4 text-neo-black" strokeWidth={4} />
          </AdaptiveMotion.span>
        )}
      </div>

      <div className="relative min-w-0 flex-1">
        <p className="font-neo-display text-base font-bold leading-tight text-neo-white">{t(titleKey)}</p>
        <p className="mt-0.5 font-neo-body text-sm leading-snug text-neo-white">{t(descKey)}</p>
        <span
          className={cn(
            'mt-1.5 inline-flex items-center gap-1 rounded-neo-sm border-2 border-neo-black px-1.5 py-px',
            'font-neo-display text-xs font-black text-neo-black',
            completed ? 'bg-neo-lime' : accent.bg,
          )}
        >
          <Star className="size-3 fill-neo-black" aria-hidden="true" />
          {t('quests.reward.xp', { xp: xpReward })}
        </span>
      </div>

      <div className="relative shrink-0">
        {completed ? (
          <AdaptiveMotion.span
            data-testid="quest-card-stamp"
            className={cn(
              'inline-block rounded-neo-sm border-3 border-neo-lime bg-neo-navy px-2 py-1',
              'font-neo-display text-sm font-black uppercase tracking-wider text-neo-lime',
              'outline-2 outline-offset-2 outline-neo-lime',
            )}
            initial={{ scale: 2, rotate: -28, opacity: 0 }}
            animate={{ scale: 1, rotate: -10, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 520, damping: 16, delay: 0.1 + index * 0.08 }}
          >
            {t('quests.done')}
          </AdaptiveMotion.span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center rounded-neo border-3 border-neo-black px-4 py-2',
              'font-neo-display text-base font-black uppercase text-neo-black shadow-hard-sm',
              'transition duration-150 group-hover:-translate-y-0.5 group-hover:shadow-hard',
              accent.bg,
            )}
          >
            {t('quests.go')}
          </span>
        )}
      </div>
    </Link>
  );
}
