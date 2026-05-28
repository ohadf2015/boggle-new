'use client';

import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserRank } from '@/lib/supabase';
import { hasSupabaseSession } from '@/utils/onboardingStorage';

const SKELETON_CLASSES = cn(
  'w-full max-w-md mx-auto lg:max-w-none',
  'bg-neo-navy-light/40 border-3 border-neo-black/40 rounded-neo-lg',
  'h-[80px] sm:h-[88px] animate-pulse'
);

export function LandingYourRank() {
  const { t } = useLanguage();
  const { isAuthenticated, profile, loading } = useAuth();
  const [rank, setRank] = useState<{ rank_position: number; total_score: number } | null>(null);
  // Sync localStorage peek so SSR + first paint agree on whether to reserve space
  // for the rank card. Avoids the "null → mount" CLS when auth resolves to authed.
  const [hadSession] = useState(() => typeof window !== 'undefined' && hasSupabaseSession());

  useEffect(() => {
    if (!isAuthenticated || !profile?.id) return;
    let cancelled = false;

    getUserRank(profile.id).then(({ data }) => {
      if (!cancelled && data) {
        setRank({
          rank_position: data.rank_position,
          total_score: data.total_score,
        });
      }
    });

    return () => { cancelled = true; };
  }, [isAuthenticated, profile?.id]);

  // Settled guest — render nothing (no token in storage AND auth has resolved unauth).
  if (!hadSession && !loading && !isAuthenticated) return null;

  // Authed-likely path: reserve space until rank arrives so the row doesn't grow.
  if (loading || !rank) {
    return <div className={SKELETON_CLASSES} aria-hidden="true" />;
  }

  return (
    <m.div
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
        <p className="text-neo-white text-[10px] font-bold uppercase tracking-wider">{t('landing.totalScore')}</p>
        <p className="font-black text-neo-white text-lg md:text-xl">
          {rank.total_score.toLocaleString()}
        </p>
      </div>
    </m.div>
  );
}
