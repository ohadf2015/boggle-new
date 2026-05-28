'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Trophy, Lock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ProfileData } from '@/contexts/auth/authTypes';

interface ProfileRankedProgressProps {
  profile: ProfileData | null;
  isDarkMode: boolean;
  canPlayRanked: boolean;
  gamesUntilRanked: number;
  delay?: number;
}

export function ProfileRankedProgress({
  profile,
  isDarkMode: _isDarkMode,
  canPlayRanked,
  gamesUntilRanked,
  delay = 0.2,
}: ProfileRankedProgressProps): React.ReactNode {
  const { t } = useLanguage();

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="relative bg-neo-navy-light overflow-hidden mb-4 border-3 border-neo-black rounded-neo shadow-hard-pink p-5"
    >
      {/* Pink ribbon — top edge */}
      <div className="absolute top-0 inset-x-0 h-2.5 bg-neo-pink">
        <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" aria-hidden />
      </div>

      <h2 className="mt-3 mb-4 text-2xl font-black font-neo-display uppercase tracking-tight flex items-center gap-2.5 text-neo-white">
        <span className="w-10 h-10 flex items-center justify-center bg-neo-pink text-neo-white border-2 border-neo-black rounded-neo shadow-hard-sm">
          <Trophy strokeWidth={2.75} className="w-5 h-5" />
        </span>
        {t('ranked.title')}
      </h2>

      {canPlayRanked ? (
        <div className="relative bg-neo-yellow text-neo-black border-3 border-neo-black rounded-neo shadow-hard p-4 overflow-hidden">
          {/* Halftone backdrop — celebratory */}
          <div className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-multiply pointer-events-none" aria-hidden />

          <div className="relative flex items-center gap-4">
            <div className="shrink-0 w-14 h-14 flex items-center justify-center bg-neo-black text-neo-yellow border-2 border-neo-black rounded-neo shadow-hard-sm">
              <Trophy strokeWidth={2.5} className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-neo-display font-black text-2xl uppercase tracking-tight leading-none">
                {t('ranked.unlocked')}
              </p>
              <p className="mt-1.5 text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                <span className="opacity-70">MMR</span>
                <span className="font-neo-display font-black text-lg tabular-nums">
                  {profile?.ranked_mmr || 1000}
                </span>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-neo-black/40 border-2 border-neo-black rounded-neo p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-7 h-7 shrink-0 flex items-center justify-center bg-neo-pink/20 text-neo-pink border border-neo-pink rounded">
                <Lock className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wide text-neo-white truncate">
                {t('ranked.unlockProgress', { current: profile?.casual_games || 0, required: 10 })}
              </span>
            </div>
            <span className="shrink-0 font-neo-display font-black text-neo-pink tabular-nums">
              {gamesUntilRanked} {t('ranked.toGo')}
            </span>
          </div>
          <div className="h-3 rounded-full overflow-hidden bg-neo-black border-2 border-neo-black">
            <m.div
              className="h-full bg-neo-pink"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, ((profile?.casual_games || 0) / 10) * 100)}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}
    </m.div>
  );
}

export default ProfileRankedProgress;
