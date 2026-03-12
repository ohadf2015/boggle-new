'use client';

import { useEffect, useState } from 'react';
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
    <div className={cn(
      'w-full max-w-md mx-auto',
      'bg-neo-navy-light border-3 border-neo-black shadow-hard-lg rounded-neo-lg',
      'p-4 sm:p-5 flex items-center gap-4'
    )}>
      <div className={cn(
        'w-12 h-12 rounded-neo border-2 border-neo-black shadow-hard-sm',
        'bg-neo-yellow flex items-center justify-center shrink-0'
      )}>
        <Trophy className="w-6 h-6 text-neo-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-black text-neo-white uppercase text-sm">
          {t('landing.yourRank')}
        </p>
        <p className="font-black text-neo-lime text-2xl">
          #{rank.rank_position}
        </p>
      </div>
      <div className="text-end">
        <p className="text-neo-white/60 text-xs">{t('landing.totalScore')}</p>
        <p className="font-black text-neo-white text-lg">
          {rank.total_score.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
