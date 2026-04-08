'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRank } from '@/lib/supabase';

export function LandingYourRank() {
  const { t } = useLanguage();
  const { isAuthenticated, profile } = useAuth();
  const [rank, setRank] = useState<{ rank_position: number; total_score: number } | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) return;
    let cancelled = false;

    getUserRank(profile.id).then(({ data }) => {
      if (!cancelled && data) setRank(data as any);
    });

    return () => { cancelled = true; };
  }, [isAuthenticated, profile?.id]);

  if (!isAuthenticated || !rank) return null;

  return (
    <motion.div
      className={cn(
        'w-full max-w-md mx-auto lg:max-w-none',
        'bg-linear-to-r from-neo-navy-light to-neo-navy',
        'border-3 border-neo-black shadow-hard-lg rounded-neo-lg',
        'p-4 sm:p-5 flex items-center gap-4',
        'relative overflow-hidden'
      )}
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      {/* Subtle rank badge glow */}
      <div className="absolute -top-6 -inset-s-6 w-24 h-24 rounded-full bg-neo-lime/10 blur-2xl pointer-events-none" aria-hidden="true" />

      <div className={cn(
        'w-12 h-12 rounded-neo border-3 border-neo-black shadow-hard-sm',
        'bg-neo-yellow flex items-center justify-center shrink-0'
      )}>
        <Trophy className="w-6 h-6 text-neo-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-neo-white uppercase text-xs tracking-wider">
          {t('landing.yourRank')}
        </p>
        <p className="font-black text-neo-lime text-2xl sm:text-3xl leading-tight">
          #{rank.rank_position}
        </p>
      </div>
      <div className="text-end">
        <p className="text-neo-white/50 text-[10px] font-bold uppercase tracking-wider">{t('landing.totalScore')}</p>
        <p className="font-black text-neo-white text-lg md:text-xl">
          {rank.total_score.toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
}
