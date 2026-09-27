'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Gamepad2, Trophy, BookOpenText } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { LevelRing } from '@/components/profile/LevelRing';
import { RankTierChip } from '@/components/seasons/RankTierChip';
import { scoreTier } from '@/lib/seasons/scoreTier';
import { getXpProgress } from '@/backend/modules/xpManager';
import { getCountryFlag } from '@/shared/utils/countryUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { cn } from '@/lib/utils';

export interface PublicProfileHeroData {
  id: string;
  username: string;
  displayName: string;
  customAvatar?: CustomAvatarConfig | null;
  countryCode?: string | null;
  currentLevel: number;
  totalXp?: number;
  totalScore?: number;
  totalGames: number;
  totalWords?: number;
  winRate: number;
}

/**
 * Public-facing identity hero for /u/[username]. Presentational only — the
 * route fetches via trpc and hands the data down, which keeps it previewable
 * and unit-testable with a real avatar_config.
 */
export function PublicProfileHero({ profile }: { profile: PublicProfileHeroData }): React.ReactNode {
  const { t } = useLanguage();
  const xp = getXpProgress(profile.totalXp || 0);
  const displayName = profile.displayName || profile.username;
  const tier = scoreTier(profile.totalScore);

  return (
    <m.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-neo-xl p-6 pt-7 bg-neo-navy-light border-3 border-neo-black shadow-hard-lg"
    >
      {/* Identity banner — segmented full-palette bar (hard blocks, no blur) */}
      <div className="absolute top-0 inset-x-0 h-2.5 flex" aria-hidden>
        {['bg-neo-lime', 'bg-neo-cyan', 'bg-neo-pink', 'bg-neo-purple', 'bg-neo-yellow'].map((c) => (
          <span key={c} className={cn('flex-1 relative', c)}>
            <span className="absolute inset-0 texture-halftone-comic opacity-30 mix-blend-overlay" />
          </span>
        ))}
      </div>

      <div className="flex items-center gap-5">
        <div className="relative shrink-0">
          <LevelRing
            percent={xp.progressPercent}
            size={80}
            isMaxLevel={xp.isMaxLevel}
            ariaLabel={`${t('profile.level')} ${profile.currentLevel}`}
          >
            <div className="relative w-full h-full rounded-full overflow-hidden">
              <Avatar customAvatar={profile.customAvatar ?? undefined} userId={profile.id} size="lg" className="w-full h-full" />
            </div>
          </LevelRing>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-neo-cyan text-neo-black border-2 border-neo-black rounded-neo shadow-hard-sm px-2 py-0.5 leading-none">
            <span className="text-[8px] font-black uppercase tracking-[0.15em] opacity-70">{t('profile.level')}</span>
            <span className="font-neo-display font-black text-sm tabular-nums">{profile.currentLevel}</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="font-black font-neo-display uppercase tracking-tight text-neo-white text-2xl md:text-3xl truncate">
            {displayName}
          </h1>
          <p className="text-sm text-gray-400 font-neo-body flex items-center gap-2">
            @{profile.username}
            {profile.countryCode && <span className="text-base">{getCountryFlag(profile.countryCode)}</span>}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {tier !== 'stone' && <RankTierChip tier={tier} size="sm" />}
          </div>
        </div>
      </div>

      {/* Stat tiles — same vocabulary as the owner's stat grid */}
      <div className="grid grid-cols-3 gap-2 mt-5">
        {[
          { icon: <Gamepad2 strokeWidth={2.5} className="w-4 h-4" />, label: t('profile.games'), value: profile.totalGames.toLocaleString(), color: 'text-neo-cyan' },
          { icon: <Trophy strokeWidth={2.5} className="w-4 h-4" />, label: t('profile.winRate'), value: `${profile.winRate}%`, color: 'text-neo-pink' },
          { icon: <BookOpenText strokeWidth={2.5} className="w-4 h-4" />, label: t('profile.totalWords'), value: (profile.totalWords ?? 0).toLocaleString(), color: 'text-neo-lime' },
        ].map((tile) => (
          <div key={tile.label} className="bg-neo-black/40 border-2 border-neo-black rounded-neo px-2.5 py-2 text-center">
            <span className={cn('inline-flex mb-1', tile.color)}>{tile.icon}</span>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-neo-white truncate leading-none">{tile.label}</p>
            <p className={cn('font-neo-display font-black text-lg leading-tight tabular-nums', tile.color)}>{tile.value}</p>
          </div>
        ))}
      </div>
    </m.div>
  );
}

export default PublicProfileHero;
