'use client';

import { m, AnimatePresence } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { tierDotClass, type navTierForPath } from '@/lib/seasons/scoreTier';
import { neoChunkyPress } from '@/components/ui/neoStyles';
import { usePress } from '@/components/motion/usePress';
import { MOTION } from '@/components/motion/tokens';

export interface BottomNavTabSpec {
  id: string;
  labelKey: string;
  icon: LucideIcon;
  color: string;
  glowColor: string;
}

interface GlobalBottomNavTabProps {
  tab: BottomNavTabSpec;
  isActive: boolean;
  indicatorClass: string;
  onSelect: (id: string) => void;
  questsCompleted: number;
  questTotal: number;
  socialBadgeCount: number;
  navTier: ReturnType<typeof navTierForPath>;
}

const RING = 2 * Math.PI * 7;

export function GlobalBottomNavTab({
  tab, isActive, indicatorClass, onSelect, questsCompleted, questTotal, socialBadgeCount, navTier,
}: GlobalBottomNavTabProps) {
  const { t } = useLanguage();
  const press = usePress<HTMLButtonElement>();
  const Icon = tab.icon;
  const questsDone = questsCompleted === questTotal;

  return (
    <button
      type="button"
      onClick={() => onSelect(tab.id)}
      {...press}
      className={cn(
        // Same sink and timing as every chunky button; the tab bar has no visible lip.
        neoChunkyPress(2),
        'shadow-transparent',
        'flex flex-col items-center justify-center relative',
        'min-w-[64px] min-h-[48px] short:min-h-[40px] medium-short:min-h-[44px]',
        'px-3 py-2 short:py-1 medium-short:py-1.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-navy rounded',
        isActive ? tab.color : 'text-neo-white',
      )}
      aria-label={t(tab.labelKey)}
      aria-current={isActive ? 'page' : undefined}
    >
      <AnimatePresence>
        {isActive && (
          <m.div
            layoutId="tab-glow"
            className={cn('absolute inset-0 rounded-xl', tab.glowColor)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={MOTION.settle}
          />
        )}
      </AnimatePresence>

      {isActive && (
        <m.div
          layoutId="tab-indicator"
          data-testid="bottom-nav-indicator"
          className={cn('absolute top-0 h-1 w-6 rounded-full -translate-y-1/2', indicatorClass)}
          transition={MOTION.pop}
        />
      )}

      <m.div
        animate={{ scale: isActive ? 1.15 : 1, y: isActive ? -1 : 0 }}
        transition={MOTION.pop}
        className="relative z-10"
      >
        <Icon className="w-6 h-6 short:w-5 short:h-5 mb-0.5 short:mb-0" aria-hidden="true" />

        {tab.id === 'quests' && questsCompleted > 0 && (
          <span
            className="absolute -top-1.5 -inset-e-2.5 flex items-center justify-center"
            aria-label={t('quests.progress', { completed: questsCompleted, total: questTotal })}
            data-testid="quest-progress-badge"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" className="-rotate-90">
              <circle cx="9" cy="9" r="7" strokeWidth="2.5" className="fill-neo-navy stroke-neo-white/15" />
              <circle
                cx="9" cy="9" r="7"
                fill="none"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - questsCompleted / questTotal)}
                className={questsDone ? 'stroke-neo-lime' : 'stroke-neo-cyan'}
              />
            </svg>
            <span className={cn(
              'absolute inset-0 flex items-center justify-center text-[8px] font-black leading-none',
              questsDone ? 'text-neo-lime' : 'text-neo-white',
            )}>
              {questsCompleted}
            </span>
          </span>
        )}

        {tab.id === 'friends' && socialBadgeCount > 0 && (
          <span
            className="absolute -top-1 -inset-e-2 flex items-center justify-center w-4 h-4 rounded-full bg-neo-pink border-2 border-neo-navy text-[8px] font-black text-neo-white leading-none"
            aria-label={t('friends.socialBadge', { count: socialBadgeCount })}
            data-testid="friend-social-badge"
          >
            {socialBadgeCount > 9 ? '9+' : socialBadgeCount}
          </span>
        )}

        {tab.id === 'dynamic' && navTier && (
          <span
            className={cn('absolute -top-1 -inset-e-1.5 w-2.5 h-2.5 rounded-full border-2 border-neo-navy', tierDotClass(navTier))}
            aria-label={t(`rank.tier.${navTier}`)}
            data-testid="profile-tier-dot"
          />
        )}
      </m.div>

      <span
        className={cn(
          'text-[10px] short:text-[9px] font-bold uppercase tracking-wide relative z-10 short:hidden medium-short:text-[9px] transition-opacity duration-150',
          isActive ? cn(tab.color, 'opacity-100') : 'text-neo-white opacity-60',
        )}
      >
        {t(tab.labelKey)}
      </span>
    </button>
  );
}
