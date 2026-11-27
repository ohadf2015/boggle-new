'use client';

import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Globe, Hash, Users } from 'lucide-react';
import { AnimatedCounter } from '../../../components/ui/AnimatedCounter';
import { cn } from '../../../lib/utils';

interface TvClassroomJoinCardsProps {
  address: string;
  joinUrl: string;
  gameCode: string;
  playerCount: number;
  dense: boolean;
  trailing?: React.ReactNode;
  t: (path: string, params?: Record<string, string | number>) => string;
}

const CARD = 'flex min-w-0 flex-col overflow-hidden rounded-neo-lg border-[3px] border-neo-black bg-edu-surface text-neo-black shadow-edu-lip';
const BAND = 'flex items-center gap-2 border-b-[3px] border-neo-black px-3 py-1 font-neo-display text-xs font-black uppercase tracking-wider text-neo-black md:text-sm';

/** The classroom wall's join row: three cream cards (address, code, players) on the sky page, the code as letter tiles. */
export function TvClassroomJoinCards({ address, joinUrl, gameCode, playerCount, dense, trailing, t }: TvClassroomJoinCardsProps) {
  return (
    <div data-testid="tv-join-row" className="flex flex-wrap items-stretch gap-2 md:flex-nowrap md:gap-4">
      <div data-testid="tv-join-card-address" className={cn(CARD, dense ? 'hidden lg:flex lg:flex-1' : 'basis-full md:basis-auto md:flex-1')}>
        <p className={cn(BAND, 'bg-neo-pink')}>
          <Globe className="size-4 shrink-0" aria-hidden="true" />
          {t('tvBroadcast.joinAt')}
        </p>
        <p dir="ltr" className="flex flex-1 items-center px-3 py-1.5 font-neo-display font-black tracking-wide [unicode-bidi:isolate] break-all text-xl lg:whitespace-nowrap lg:break-normal lg:text-[clamp(1rem,1.3vw,2rem)]">
          {address}
        </p>
      </div>

      <div data-testid="tv-join-card-code" className={cn(CARD, 'shrink-0 max-md:flex-1')}>
        <p id="game-code-label" className={cn(BAND, 'justify-center bg-neo-yellow')}>
          <Hash className="size-4 shrink-0" aria-hidden="true" />
          {t('tvBroadcast.gameCode')}
        </p>
        <div role="status" aria-labelledby="game-code-label" className="flex flex-1 items-center justify-center px-2 py-1.5 md:px-3">
          <span
            dir="ltr"
            aria-label={`Game code: ${gameCode.split('').join(' ')}`}
            className={cn('flex gap-[0.12em] font-neo-display font-black uppercase leading-none', dense ? 'text-3xl md:text-4xl 2xl:text-5xl' : 'text-4xl md:text-6xl')}
          >
            {gameCode.split('').map((ch, i) => (
              <span
                key={`${ch}-${i}`}
                data-testid="tv-code-tile"
                aria-hidden="true"
                className="inline-grid min-w-[0.9em] place-items-center rounded-[0.18em] border-[3px] border-neo-black bg-edu-tile px-[0.08em] py-[0.1em] text-neo-black shadow-edu-lip-sm"
              >
                {ch}
              </span>
            ))}
          </span>
        </div>
      </div>

      <div data-testid="tv-join-card-players" className={cn(CARD, 'shrink-0')}>
        <p className={cn(BAND, 'bg-neo-cyan')}>
          <Users className="size-4 shrink-0" aria-hidden="true" />
          {t('tvBroadcast.players')}
        </p>
        <div className="flex flex-1 items-center gap-3 px-3 py-1.5">
          <div className="hidden items-center gap-2 md:flex" data-testid="player-count-wrapper">
            <Users className="size-6" aria-hidden="true" />
            <AnimatedCounter value={playerCount} className="font-neo-display text-3xl font-black text-neo-black" size="xl" formatValue={(v) => String(Math.round(v))} />
          </div>
          <div className="rounded-neo border-[3px] border-neo-black bg-edu-paper p-1.5 shadow-edu-lip-sm">
            <QRCodeSVG value={joinUrl} size={dense ? 64 : 80} level="M" bgColor="#ffffff" fgColor="#000000" />
          </div>
        </div>
      </div>
      {trailing && <div className="flex shrink-0 items-center gap-2">{trailing}</div>}
    </div>
  );
}
