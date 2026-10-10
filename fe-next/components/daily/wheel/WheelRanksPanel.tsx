'use client';

import React from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from '@/components/Avatar';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';

export interface RivalScore {
  name: string;
  score: number;
  avatarImage: string | null;
  customAvatar: CustomAvatarConfig | null;
  playerId: string | null;
  guestFingerprint: string | null;
}

interface WheelRanksPanelProps {
  rivals: RivalScore[];
  score: number;
  hasNextRival: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/** Desktop live-ranks column: the day's board with the player's own row pinned. */
const WheelRanksPanel: React.FC<WheelRanksPanelProps> = ({ rivals, score, hasNextRival, t }) => (
  <div className="h-full flex flex-col overflow-hidden">
    <div className="flex items-center justify-between px-4 py-3 border-b-3 border-neo-black shrink-0 bg-neo-black/30">
      <div className="flex items-center gap-2">
        <Trophy className="w-4 h-4 text-neo-yellow" />
        <span className="font-bold text-neo-white text-sm uppercase tracking-wide">
          {t('wordHunt.desktop.liveRanks')}
        </span>
      </div>
    </div>
    <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 space-y-1 scrollbar-thin scrollbar-thumb-neo-cream/20 scrollbar-track-transparent">
      {rivals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-neo-white/70 text-center gap-1">
          <Trophy className="w-7 h-7 opacity-40" />
          <span className="text-xs">{t('wordHunt.desktop.beFirst')}</span>
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {[...rivals].reverse().map((rival, idx) => (
          <m.div
            key={`rival-${rival.playerId}-${idx}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-neo transition-colors',
              'bg-neo-black/20 hover:bg-neo-black/30'
            )}
          >
            <span className="w-6 text-center font-black text-sm tabular-nums shrink-0 text-neo-white">
              {idx + 1}
            </span>
            <div className="shrink-0">
              <Avatar
                customAvatar={rival.customAvatar ?? undefined}
                avatarImage={rival.avatarImage ?? undefined}
                userId={rival.playerId ?? rival.name}
                size="sm"
              />
            </div>
            <span className="truncate text-xs font-semibold text-neo-white min-w-0">
              {rival.name}
            </span>
            <span className="font-black text-neo-cyan text-xs shrink-0 ms-auto">
              {rival.score}
            </span>
          </m.div>
        ))}
        <m.div
          key="you-row"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-2 py-1.5 rounded-neo bg-neo-cyan/10 ring-2 ring-neo-cyan/60"
        >
          <span className="w-6 text-center font-black text-sm tabular-nums shrink-0 text-neo-cyan">
            {hasNextRival ? rivals.findIndex(r => r.score >= score) + 1 : 1}
          </span>
          <div className="shrink-0">
            <Avatar
              customAvatar={undefined}
              avatarImage={undefined}
              userId="me"
              size="sm"
            />
          </div>
          <span className="truncate text-xs font-semibold text-neo-white min-w-0">
            {t('common.you')}
          </span>
          <span className="font-black text-neo-lime text-xs shrink-0 ms-auto">
            {score}
          </span>
        </m.div>
      </AnimatePresence>
    </div>
  </div>
);

export default WheelRanksPanel;
