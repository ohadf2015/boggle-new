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

/** Rows visible before "see full leaderboard". */
const PREVIEW_ROWS = 3;
const MEDAL = ['bg-neo-yellow', 'bg-neo-cyan', 'bg-neo-orange'];

export function QuickLeaderboardCard({ entries }: QuickLeaderboardCardProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [showFullBoard, setShowFullBoard] = useState(false);

  if (entries.length === 0) {
    return null;
  }

  const mine = entries.find((e) => e.userId === user?.id);
  const preview = entries.slice(0, PREVIEW_ROWS);
  // Your own row always shows, even when you sit below the preview cut.
  const rows = showFullBoard ? entries : mine && !preview.includes(mine) ? [...preview, mine] : preview;

  return (
    <div className="overflow-hidden rounded-2xl border-neo-thick border-black bg-neo-navy-elevated shadow-hard" data-testid="quick-leaderboard">
      <div className="border-b-[3px] border-black bg-neo-cyan px-3 py-1.5 font-neo-display text-[11px] font-bold uppercase tracking-[0.16em] text-black">
        {t('quickPlay.solo.todayBoard', "Today's top scores")}
      </div>
      <ol>
        {rows.map((e) => {
          const isMe = e.userId === user?.id;
          return (
            <li
              key={e.userId}
              data-me={isMe || undefined}
              className={`flex items-center gap-3 border-b-2 border-black/40 px-3 py-2 text-sm text-neo-cream last:border-b-0 ${
                isMe ? 'bg-neo-lime/15 shadow-[inset_4px_0_0_rgb(var(--neo-lime))]' : ''
              }`}
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-black font-neo-display text-xs font-bold ${
                  e.rank <= 3 ? `${MEDAL[e.rank - 1]} text-black shadow-hard-sm` : 'text-neo-white/60'
                }`}
              >
                {e.rank}
              </span>
              <Avatar userId={e.userId} customAvatar={e.customAvatar ?? undefined} size="sm" disableEffects tierMarker={e.rank <= 3} />
              <span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span>
              <span className="font-neo-display font-bold tabular-nums" dir="ltr">{e.bestScorePct}%</span>
            </li>
          );
        })}
      </ol>
      {!showFullBoard && entries.length > rows.length && (
        <button
          type="button"
          onClick={() => setShowFullBoard(true)}
          className="flex h-[44px] w-full items-center justify-center border-t-2 border-black/40 text-sm font-bold tracking-wide text-neo-cyan"
        >
          {t('quickPlay.solo.seeLeaderboard')}
        </button>
      )}
    </div>
  );
}
