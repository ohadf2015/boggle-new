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

  if (loading || champions.length === 0) return null;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <motion.h3
        className="font-black text-neo-white uppercase text-sm sm:text-base text-center mb-4"
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <Crown className="w-5 h-5 text-neo-yellow inline-block me-2" />
        {t('landing.hallOfFame')}
      </motion.h3>

      <div className="flex gap-3 overflow-x-auto pb-2 px-2 snap-x snap-mandatory scrollbar-hide justify-center">
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
              'shrink-0 w-36 sm:w-40',
              'bg-neo-cream border-3 border-neo-black shadow-hard rounded-neo-lg',
              'p-3 flex flex-col items-center text-center snap-center',
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
            <p className="font-bold text-neo-navy text-xs">
              {champ.totalScore.toLocaleString()}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
