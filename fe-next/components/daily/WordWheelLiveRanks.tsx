import React from 'react';
import { m } from 'framer-motion';
import { Trophy } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { cn } from '@/lib/utils';
import type { LadderRival } from './WordWheelRankLadder';

type T = (key: string, params?: Record<string, string | number>) => string;

interface Row { name: string; score: number; you: boolean; rival?: LadderRival }

export default function WordWheelLiveRanks({ t, score, rivals }: { t: T; score: number; rivals: LadderRival[] }) {
  const rows: Row[] = rivals.map(r => ({ name: r.name, score: r.score, you: false, rival: r }));
  rows.push({ name: 'you', score, you: true });
  rows.sort((a, b) => b.score - a.score || (a.you ? -1 : b.you ? 1 : 0));

  return (
    <div className="flex flex-col min-h-0 h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b-3 border-neo-black bg-neo-black/30 shrink-0">
        <Trophy className="w-4 h-4 text-neo-yellow" aria-hidden />
        <span className="font-black text-neo-white text-sm uppercase tracking-wide">{t('wordHunt.desktop.liveRanks')}</span>
      </div>
      {rivals.length === 0 && (
        <p className="px-4 pt-3 text-neo-white/55 text-xs font-semibold">{t('wordHunt.desktop.beFirst')}</p>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 space-y-1">
        {rows.map((row, i) => (
          <m.div
            layout
            key={row.you ? 'you' : `${row.rival?.playerId ?? row.name}-${i}`}
            data-testid="live-rank-row"
            data-name={row.name}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-lg',
              row.you ? 'bg-neo-lime text-neo-black' : 'bg-neo-black/25 text-neo-white',
            )}
          >
            <span className="w-6 text-center font-black text-sm tabular-nums">{i + 1}</span>
            {row.rival && (
              <Avatar
                pixelSize={22}
                userId={row.rival.playerId ?? row.name}
                customAvatar={row.rival.customAvatar ?? undefined}
                avatarImage={row.rival.avatarImage ?? undefined}
                className="shrink-0 rounded-full"
              />
            )}
            <span className="flex-1 min-w-0 truncate text-xs font-bold">{row.you ? t('common.you') : row.name}</span>
            <span className="font-black text-xs tabular-nums">{row.score}</span>
          </m.div>
        ))}
      </div>
    </div>
  );
}
