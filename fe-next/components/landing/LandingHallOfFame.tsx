'use client';

import { m } from 'framer-motion';
import { Crown, Medal, Award } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { HallOfFameEntry } from '@/hooks/useHallOfFame';

const PODIUM_CONFIG = [
  { rotate: -2, accent: 'border-yellow-400 bg-linear-to-b from-yellow-400/20 to-yellow-600/10', medal: 'text-yellow-400', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.3)]', rank: '1st', elevated: true },
  { rotate: 2, accent: 'border-gray-300 bg-linear-to-b from-gray-300/15 to-gray-400/5', medal: 'text-gray-300', glow: '', rank: '2nd', elevated: false },
  { rotate: -1.5, accent: 'border-amber-600 bg-linear-to-b from-amber-600/15 to-amber-700/5', medal: 'text-amber-600', glow: '', rank: '3rd', elevated: false },
  { rotate: 2.5, accent: 'border-neo-cyan/40 bg-neo-cyan/5', medal: 'text-neo-cyan/60', glow: '', rank: '4th', elevated: false },
  { rotate: -1, accent: 'border-neo-pink/40 bg-neo-pink/5', medal: 'text-neo-pink/60', glow: '', rank: '5th', elevated: false },
];

const MEDAL_ICONS = [Crown, Medal, Award] as const;

const cardVariants = {
  hidden: { opacity: 0, y: 50, scale: 0.85, rotate: 0 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: PODIUM_CONFIG[i % PODIUM_CONFIG.length].rotate,
    transition: { type: 'spring' as const, stiffness: 300, damping: 16, delay: i * 0.12 },
  }),
};

interface LandingHallOfFameProps {
  champions: HallOfFameEntry[];
  loading: boolean;
}

export function LandingHallOfFame({ champions, loading }: LandingHallOfFameProps) {
  const { t } = useLanguage();

  if (champions.length === 0 && !loading) return null;

  if (loading) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-5 h-5 rounded bg-neo-yellow/30 animate-pulse" />
          <div className="h-5 w-28 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 justify-center items-end flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={`hof-skel-${i}`}
              className={cn(
                'w-32 sm:w-36 md:w-40 bg-neo-cream/20 border-3 border-neo-black/20 rounded-neo-lg shadow-hard p-3 flex flex-col items-center',
                i === 0 && 'sm:-mt-4',
              )}
              style={{ transform: `rotate(${[-2, 2, -1.5][i]}deg)` }}
            >
              <div className="w-6 h-6 rounded bg-neo-yellow/30 mb-1 animate-pulse" />
              <div className="w-12 h-12 rounded-full bg-neo-white/10 mb-2 animate-pulse" />
              <div className="h-4 w-20 bg-neo-black/10 rounded mb-1 animate-pulse" />
              <div className="h-5 w-14 bg-neo-black/10 rounded mb-1 animate-pulse" />
              <div className="h-2.5 w-16 bg-neo-black/5 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Reorder for podium: [#2, #1, #3, #4, #5] so #1 is center
  const podiumOrder = champions.length >= 3
    ? [champions[1], champions[0], champions[2], ...champions.slice(3)]
    : champions;
  const podiumIndices = champions.length >= 3
    ? [1, 0, 2, ...Array.from({ length: Math.max(0, champions.length - 3) }, (_, i) => i + 3)]
    : champions.map((_, i) => i);

  return (
    <div className="w-full max-w-4xl mx-auto">
      <m.h3
        className="font-black text-neo-white uppercase text-sm sm:text-base text-center mb-6"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Crown className="w-5 h-5 text-neo-yellow inline-block me-2" aria-hidden="true" />
        <span className="neo-title-sm">{t('landing.hallOfFame')}</span>
      </m.h3>

      <div className="flex gap-3 sm:gap-4 lg:gap-6 pb-4 pt-4 px-2 justify-center items-end flex-wrap">
        {podiumOrder.map((champ, idx) => {
          const originalIndex = podiumIndices[idx];
          const config = PODIUM_CONFIG[originalIndex % PODIUM_CONFIG.length];
          const MedalIcon = MEDAL_ICONS[Math.min(originalIndex, 2)];

          return (
            <m.div
              key={champ.username}
              custom={originalIndex}
              variants={cardVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              whileHover={{
                y: -10,
                scale: 1.08,
                rotate: 0,
                transition: { type: 'spring', stiffness: 400, damping: 14 },
              }}
              className={cn(
                'shrink-0 w-28 sm:w-34 md:w-38 lg:w-44 xl:w-48',
                'border-3 border-neo-black shadow-hard rounded-neo-lg',
                'p-3 sm:p-4 lg:p-5 flex flex-col items-center text-center',
                'cursor-default select-none',
                config.accent, config.glow,
                config.elevated && 'sm:-mt-6 sm:w-38 md:w-44 lg:w-52 xl:w-56 sm:p-5 lg:p-6',
              )}
            >
              <m.div
                className="mb-1"
                animate={originalIndex === 0
                  ? { rotate: [0, -10, 10, -5, 5, 0], y: [0, -4, 0] }
                  : undefined
                }
                transition={originalIndex === 0
                  ? { duration: 2, repeat: Infinity, repeatDelay: 3 }
                  : undefined
                }
              >
                <MedalIcon className={cn(
                  'w-6 h-6',
                  config.medal,
                  originalIndex === 0 && 'w-7 h-7',
                )} />
              </m.div>

              <div className={cn(
                'relative',
                originalIndex === 0 && 'ring-2 ring-yellow-400/50 ring-offset-2 ring-offset-transparent rounded-full',
              )}>
                <Avatar
                  avatarImage={champ.avatarImage ?? undefined}

                  customAvatar={champ.avatarConfig}
                  size={originalIndex === 0 ? 'xl' : 'lg'}
                />
              </div>

              <p className={cn(
                'font-black text-neo-white text-sm mt-2 truncate w-full',
                originalIndex === 0 && 'text-base',
              )}>
                {champ.displayName || champ.username}
              </p>
              <p className={cn(
                'font-black text-neo-lime text-lg',
                originalIndex === 0 && 'text-xl',
              )}>
                {champ.totalScore.toLocaleString()}
              </p>
              <p className="text-neo-white text-[10px] font-bold uppercase tracking-wider">
                {t('landing.careerPoints')}
              </p>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
