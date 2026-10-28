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
      <h3 className="mb-2 px-1 font-neo-display text-xs font-black uppercase tracking-[0.18em] text-neo-white tv:text-lg">
        {t('blast.results.badgesEarned')}
      </h3>
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
                data-reveal={badge.isNew ? 'badge-new' : 'chip'}
                data-testid={`blast-badge-${badge.id}`}
                aria-label={`${badge.label}: ${badge.desc}`}
                className={cn(
                  'relative flex cursor-help items-center gap-2 rounded-neo border-3 border-neo-black py-1.5 pe-3 ps-1.5 shadow-hard',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-neo-pink',
                  badge.isNew ? 'bg-neo-lime' : 'bg-neo-navy text-neo-white',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-neo-black shadow-hard-sm',
                    badge.isNew ? 'bg-neo-yellow text-neo-black' : 'bg-neo-navy-light text-neo-lime',
                  )}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.75} />
                </span>
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
