'use client';

import { motion } from 'framer-motion';
import { Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import Avatar from '@/components/Avatar';
import type { HallOfFameEntry } from '@/hooks/useHallOfFame';

const ROTATIONS = [-3, 2, -2, 3, -1];

const cardVariants = {
  hidden: { opacity: 0, y: 40, rotate: 0 },
  visible: (i: number) => ({
    opacity: 1, y: 0, rotate: ROTATIONS[i % ROTATIONS.length],
    transition: { type: 'spring' as const, stiffness: 260, damping: 15, delay: i * 0.1 },
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
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="w-5 h-5 rounded bg-neo-yellow/30 animate-pulse" />
          <div className="h-5 w-28 bg-neo-white/10 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 justify-center flex-wrap">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="w-32 sm:w-36 md:w-40 bg-neo-cream/20 border-3 border-neo-black/20 rounded-neo-lg shadow-hard p-3 flex flex-col items-center"
              style={{ transform: `rotate(${[-3, 2, -2][i]}deg)` }}
            >
              {i === 0 && <div className="w-6 h-6 rounded bg-neo-yellow/30 mb-1 animate-pulse" />}
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

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.h3
        className="font-black text-neo-white uppercase text-sm sm:text-base text-center mb-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Crown className="w-5 h-5 text-neo-yellow inline-block me-2" aria-hidden="true" />
        <span className="neo-title-sm">{t('landing.hallOfFame')}</span>
      </motion.h3>

      <div className="flex gap-3 pb-4 pt-4 px-2 justify-center flex-wrap">
        {champions.map((champ, i) => (
          <motion.div
            key={champ.username}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            whileHover={{
              y: -8,
              scale: 1.06,
              rotate: 0,
              boxShadow: '6px 6px 0px black',
              transition: { type: 'spring', stiffness: 400, damping: 15 },
            }}
            className={cn(
              'shrink-0 w-32 sm:w-36 md:w-40',
              'bg-neo-cream border-3 border-neo-black shadow-hard rounded-neo-lg',
              'p-3 flex flex-col items-center text-center',
              'cursor-default select-none'
            )}
          >
            {i === 0 && (
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0], y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Crown className="w-6 h-6 text-yellow-500 mb-1" />
              </motion.div>
            )}
            <Avatar
              avatarImage={champ.avatarImage ?? undefined}
              profilePictureUrl={champ.profilePictureUrl}
              customAvatar={champ.avatarConfig as any}
              size="lg"
            />
            <p className="font-black text-neo-black text-sm mt-2 truncate w-full">
              {champ.displayName || champ.username}
            </p>
            <p className="font-black text-neo-navy text-lg">
              {champ.totalScore.toLocaleString()}
            </p>
            <p className="text-neo-navy/60 text-[10px] font-bold uppercase tracking-wider">
              {t('landing.careerPoints')}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
