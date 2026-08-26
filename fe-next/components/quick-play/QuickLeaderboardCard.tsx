'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

interface LeaderboardEntry {
  userId: string;
  name: string;
  bestScorePct: number;
  rank: number;
  customAvatar?: CustomAvatarConfig | null;
}

interface QuickLeaderboardCardProps {
  entries: LeaderboardEntry[];
}

export function QuickLeaderboardCard({ entries }: QuickLeaderboardCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showFullBoard, setShowFullBoard] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border-neo-thick border-black bg-neo-navy-elevated shadow-hard">
      {!showFullBoard ? (
        <button
          type="button"
          onClick={() => setShowFullBoard(true)}
          className="flex h-[44px] w-full items-center justify-center text-sm font-bold tracking-wide text-neo-cyan"
        >
          {t('quickPlay.solo.seeLeaderboard')}
        </button>
      ) : (
        entries.map((e) => {
          const isMe = e.userId === user?.id;
          return (
            <div
              key={e.userId}
              className={`flex items-center gap-3 border-b-2 border-black/40 px-4 py-2 text-sm last:border-b-0 ${
                isMe ? 'bg-neo-cozy/15 text-neo-cream' : 'text-neo-cream'
              }`}
            >
              <span className="w-5 text-center font-neo-display font-bold text-neo-white/55">{e.rank}</span>
              <Avatar
                userId={e.userId}
                customAvatar={e.customAvatar ?? undefined}
                size="sm"
                disableEffects
                tierMarker={e.rank <= 3}
              />
              <span className="flex-1 truncate">{e.name}</span>
              <span className="font-neo-display font-semibold">{e.bestScorePct}%</span>
            </div>
          );
        })
      )}
    </div>
  );
}
