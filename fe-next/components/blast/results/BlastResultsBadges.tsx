'use client';

import type { ComponentType } from 'react';
import { BookOpen, Crown, Flag, Link as LinkIcon, Sparkles, Target, Trophy, Waves } from 'lucide-react';
import { MobileTooltip } from '@/components/ui/MobileTooltip';
import { cn } from '@/lib/utils';
import type { BlastTranslate } from './types';

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const BADGE_ICONS: Record<string, IconType> = {
  Sparkles, Waves, Flag, Link: LinkIcon, Crown, BookOpen, Target, Trophy,
};

export interface BlastResultBadge {
  id: string;
  icon: string;
  label: string;
  desc: string;
  isNew?: boolean;
}

export function BlastResultsBadges({ badges, t }: { badges: BlastResultBadge[]; t: BlastTranslate }) {
  if (badges.length === 0) return null;
  return (
    <section className="w-full" data-testid="blast-results-badges">
      <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-neo-white">
        {t('blast.results.badgesEarned')}
      </p>
      <div className="flex flex-wrap gap-2">
        {badges.map((badge) => {
          const Icon = BADGE_ICONS[badge.icon] ?? Sparkles;
          return (
            <MobileTooltip
              key={badge.id}
              side="top"
              delayDuration={150}
              contentClassName="max-w-[220px] text-center"
              content={
                <>
                  <p className="font-neo-display text-[11px] font-black uppercase text-neo-pink">{badge.label}</p>
                  <p className="mt-0.5 text-xs">{badge.desc}</p>
                </>
              }
            >
              <button
                type="button"
                data-reveal="chip"
                data-testid={`blast-badge-${badge.id}`}
                aria-label={`${badge.label}: ${badge.desc}`}
                className={cn(
                  'relative flex cursor-help items-center gap-1.5 rounded-neo border-3 border-neo-black px-3 py-2 shadow-hard',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
                  badge.isNew ? 'bg-neo-lime' : 'bg-neo-navy text-neo-white',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', badge.isNew ? 'text-neo-black' : 'text-neo-lime')} strokeWidth={2.75} />
                <span
                  className={cn(
                    'font-neo-display text-[11px] font-black uppercase tracking-wide',
                    badge.isNew ? 'text-neo-black' : 'text-neo-white',
                  )}
                >
                  {badge.label}
                </span>
                {badge.isNew && (
                  <span className="absolute -end-2 -top-2 rotate-[-8deg] rounded border-2 border-neo-black bg-neo-pink px-1.5 py-0.5 font-neo-display text-[8px] font-black uppercase tracking-wider text-neo-white shadow-hard-sm">
                    {t('blast.results.newBadge')}
                  </span>
                )}
              </button>
            </MobileTooltip>
          );
        })}
      </div>
    </section>
  );
}
