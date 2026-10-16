'use client';

import { memo } from 'react';
import { Check } from 'lucide-react';
import Avatar from '../../../components/Avatar';
import { cn } from '../../../lib/utils';
import type { Avatar as AvatarType } from '@/shared/types/game';

export interface ReadyPlayer {
  username: string;
  avatar?: AvatarType | null;
  isBot?: boolean;
  ready: boolean;
}

interface TvResultsReadyStripProps {
  players: ReadyPlayer[];
  t: (path: string, params?: Record<string, string | number>) => string;
}

const MAX_FACES = 8;
const NARROW_FACES = 4;
const CHIP = 'inline-flex shrink-0 items-center rounded-neo border-3 border-neo-black bg-neo-navy-elevated px-2 py-1 font-neo-display text-lg font-black text-neo-cream';

const TvResultsReadyStrip = memo<TvResultsReadyStripProps>(({ players, t }) => {
  const isReady = (p: ReadyPlayer) => p.ready || !!p.isBot;
  const readyCount = players.filter(isReady).length;
  const allReady = players.length > 0 && readyCount === players.length;
  const faces = [...players].sort((a, b) => Number(isReady(b)) - Number(isReady(a))).slice(0, MAX_FACES);

  return (
    <div data-testid="tv-results-ready-strip" className="flex min-w-0 items-center gap-3">
      <span
        data-testid="ready-count"
        className={cn(
          'shrink-0 rounded-neo border-3 border-neo-black px-3 py-1 font-neo-display text-xl font-black text-neo-black shadow-hard-sm',
          allReady ? 'bg-neo-lime' : 'bg-neo-yellow'
        )}
      >
        {readyCount}/{players.length}
      </span>
      <div className="flex shrink-0 items-center -space-x-2 rtl:space-x-reverse">
        {faces.map((p, i) => (
          <span
            key={p.username}
            data-testid="ready-player"
            title={p.username}
            className={cn('relative shrink-0', i >= NARROW_FACES && 'hidden min-[1600px]:inline-block')}
          >
            <Avatar
              avatarImage={p.avatar?.avatarImage}
              customAvatar={p.avatar?.customAvatar}
              size="lg"
              className={cn('border-3 border-neo-black', !isReady(p) && 'grayscale')}
            />
            {isReady(p) && (
              <span className="absolute -bottom-1 -end-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-neo-black bg-neo-lime">
                <Check className="h-3 w-3 text-neo-black" strokeWidth={4} />
              </span>
            )}
          </span>
        ))}
      </div>
      {players.length > NARROW_FACES && (
        <span className={cn(CHIP, 'min-[1600px]:hidden')}>+{players.length - NARROW_FACES}</span>
      )}
      {players.length > MAX_FACES && (
        <span className={cn(CHIP, 'hidden min-[1600px]:inline-flex')}>+{players.length - MAX_FACES}</span>
      )}
      <span className="hidden min-w-0 font-neo-display text-base font-black uppercase leading-tight text-neo-cream min-[1600px]:inline">
        {allReady ? t('results.everyoneReady') : t('results.waitingForPlayers')}
      </span>
    </div>
  );
});

TvResultsReadyStrip.displayName = 'TvResultsReadyStrip';

export default TvResultsReadyStrip;
