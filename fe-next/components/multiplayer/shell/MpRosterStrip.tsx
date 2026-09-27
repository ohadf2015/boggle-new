'use client';

import { memo } from 'react';
import { Bot, Check, Crown, Plus } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { MpRosterPlayer } from '@/lib/multiplayer/roster';

export type { MpRosterPlayer } from '@/lib/multiplayer/roster';

export interface MpRosterStripProps {
  /** From `toMpRoster` — sorted best first. */
  players: MpRosterPlayer[];
  meId: string;
  /** `row` in-round phone strip · `rail` desktop in-round rail · `grid` lobby seats. */
  layout: 'row' | 'rail' | 'grid';
  /** Cap on visible players (row/rail). Overflow becomes a "+N" chip; I always stay visible. */
  max?: number;
  showScores?: boolean;
  /** grid only: total seats; the rest render as dashed empty seats. */
  seats?: number;
  /** Tap on a seat: the player id, or `null` for an empty seat (host "+ BOT"). */
  onSeatAction?: (id: string | null) => void;
  className?: string;
}

/** Pick at most `max` players, best first, but never drop me. */
function visiblePlayers(players: MpRosterPlayer[], meId: string, max?: number): MpRosterPlayer[] {
  if (!max || players.length <= max) return players;
  const head = players.slice(0, max);
  if (head.some((p) => p.id === meId)) return head;
  const me = players.find((p) => p.id === meId);
  return me ? [...players.slice(0, max - 1), me] : head;
}

const AVATAR_PX = { row: 28, rail: 40, grid: 72 } as const;

function MpRosterStripImpl({ players, meId, layout, max, showScores, seats, onSeatAction, className }: MpRosterStripProps) {
  const { t } = useLanguage();
  const shown = visiblePlayers(players, meId, max);
  const overflow = players.length - shown.length;
  const empty = layout === 'grid' && seats ? Math.max(0, seats - shown.length) : 0;
  const px = AVATAR_PX[layout];
  const Seat = onSeatAction ? 'button' : 'div';

  return (
    <div
      data-testid="mp-roster-strip"
      data-layout={layout}
      className={cn(
        layout === 'row' && 'flex items-center gap-2 overflow-hidden',
        layout === 'rail' && 'flex flex-col gap-2',
        layout === 'grid' && 'grid grid-cols-4 gap-3 lg:gap-4',
        className,
      )}
    >
      {shown.map((p) => {
        const isMe = p.id === meId;
        return (
          <Seat
            key={p.id}
            type={onSeatAction ? 'button' : undefined}
            onClick={onSeatAction ? () => onSeatAction(p.id) : undefined}
            data-testid="mp-roster-seat"
            data-player={p.id}
            data-me={String(isMe)}
            data-conn={p.conn}
            className={cn(
              'relative flex items-center min-w-0 text-neo-white',
              layout === 'grid' ? 'flex-col gap-1' : 'gap-1.5',
              p.conn !== 'ok' && 'opacity-50',
            )}
          >
            <span
              className={cn(
                'relative shrink-0 rounded-full border-2',
                isMe ? 'border-neo-lime' : 'border-neo-black',
              )}
              style={{ width: `calc(${px}px * var(--mp-u, 1))`, height: `calc(${px}px * var(--mp-u, 1))` }}
            >
              <Avatar
                avatarImage={p.avatar?.avatarImage}
                customAvatar={p.avatar?.customAvatar ?? null}
                userId={p.name}
                pixelSize={px}
                disableEffects
              />
              {p.isHost && (
                <Crown data-testid="mp-roster-crown" aria-label={t('mpUi.shell.host')} className="absolute -top-2 start-1/2 -translate-x-1/2 rtl:translate-x-1/2 w-4 h-4 text-neo-yellow" />
              )}
              {p.isBot && (
                <Bot data-testid="mp-roster-bot" aria-label={t('mpUi.shell.bot')} className="absolute -bottom-1 -end-1 w-4 h-4 rounded-full bg-neo-cyan text-neo-black p-0.5" />
              )}
              {p.isReady && (
                <Check data-testid="mp-roster-ready" aria-label={t('mpUi.shell.ready')} className="absolute -top-1 -end-1 w-5 h-5 rounded-full bg-neo-lime text-neo-black p-0.5" />
              )}
            </span>
            <span className={cn('truncate font-neo-body', layout === 'row' ? 'max-w-16 text-xs' : 'text-sm')} dir="auto">
              {p.name}
            </span>
            {showScores && (
              <span className="font-neo-display font-bold tabular-nums text-xs text-neo-lime">{p.score}</span>
            )}
          </Seat>
        );
      })}
      {overflow > 0 && (
        <span data-testid="mp-roster-overflow" className="shrink-0 rounded-full bg-neo-navy-light px-2 text-xs font-bold text-neo-white">
          +{overflow}
        </span>
      )}
      {Array.from({ length: empty }, (_, i) => {
        const EmptySeat = onSeatAction ? 'button' : 'div';
        return (
          <EmptySeat
            key={`empty-${i}`}
            type={onSeatAction ? 'button' : undefined}
            onClick={onSeatAction ? () => onSeatAction(null) : undefined}
            data-testid="mp-roster-empty"
            aria-label={t('mpUi.shell.emptySeat')}
            className="flex items-center justify-center rounded-full border-2 border-dashed border-neo-white/30 text-neo-white/50"
            style={{ width: `calc(${px}px * var(--mp-u, 1))`, height: `calc(${px}px * var(--mp-u, 1))` }}
          >
            {onSeatAction && <Plus aria-hidden="true" className="w-5 h-5" />}
          </EmptySeat>
        );
      })}
    </div>
  );
}

export const MpRosterStrip = memo(MpRosterStripImpl);
MpRosterStrip.displayName = 'MpRosterStrip';
