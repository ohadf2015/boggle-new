'use client';

import { useEffect, useRef, useState } from 'react';
import { Zap } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { Socket } from 'socket.io-client';
import { RIVAL_EVENTS, type RivalAvatar, type RivalFlipPayload } from '@/shared/types/rivalry';

export const RIVAL_TICKER_MAX = 3;
export const RIVAL_TICKER_SHOW_MS = 4_000;
export const RIVAL_TICKER_FADE_MS = 700;

interface TickerItem {
  id: number;
  name: string;
  avatar: RivalAvatar;
  fading: boolean;
}

type TickerSocket = Pick<Socket, 'on' | 'off'>;

interface RivalTickerProps {
  socket: TickerSocket | null | undefined;
  className?: string;
}

export default function RivalTicker({ socket, className }: RivalTickerProps) {
  const { t } = useLanguage();
  const [items, setItems] = useState<TickerItem[]>([]);
  const [reserved, setReserved] = useState(false);
  const nextId = useRef(0);
  const session = useRef<number | null>(null);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>[]>());

  useEffect(() => {
    if (!socket) return;
    const live = timers.current;
    const drop = (id: number) => {
      live.get(id)?.forEach(clearTimeout);
      live.delete(id);
    };
    const clearAll = () => {
      for (const id of [...live.keys()]) drop(id);
      setItems([]);
      setReserved(false);
    };
    const current = (id: number | null | undefined) => {
      if (typeof id !== 'number') return true;
      if (session.current !== null && id < session.current) return false;
      session.current = id;
      return true;
    };

    const onFlip = (data: RivalFlipPayload) => {
      if (!data?.winnerName || !current(data.gameSessionId)) return;
      const id = ++nextId.current;
      live.set(id, [
        setTimeout(() => setItems((all) => all.map((i) => (i.id === id ? { ...i, fading: true } : i))), RIVAL_TICKER_SHOW_MS),
        setTimeout(() => {
          drop(id);
          setItems((all) => all.filter((i) => i.id !== id));
        }, RIVAL_TICKER_SHOW_MS + RIVAL_TICKER_FADE_MS),
      ]);
      setReserved(true);
      setItems((all) => {
        const next = [{ id, name: data.winnerName, avatar: data.winnerAvatar ?? null, fading: false }, ...all];
        next.slice(RIVAL_TICKER_MAX).forEach((i) => drop(i.id));
        return next.slice(0, RIVAL_TICKER_MAX);
      });
    };

    const onStart = (data: { gameSessionId?: number } | undefined) => {
      const previous = session.current;
      if (!current(data?.gameSessionId)) return;
      if (data?.gameSessionId !== previous) clearAll();
    };

    socket.on(RIVAL_EVENTS.flip, onFlip);
    socket.on('startGame', onStart);
    return () => {
      socket.off(RIVAL_EVENTS.flip, onFlip);
      socket.off('startGame', onStart);
      for (const id of [...live.keys()]) drop(id);
    };
  }, [socket]);

  if (!reserved) return null;
  const [lead, ...older] = items;

  return (
    <div data-testid="rival-ticker" className={cn('@container w-full min-w-0', className)} aria-label={t('education.rivals.ticker.label')}>
      <ul
        data-testid="rival-ticker-list"
        className="flex min-h-[2.2em] min-w-0 items-center gap-[1.5cqi] overflow-hidden whitespace-nowrap font-neo-display text-[clamp(1.125rem,2.1cqi,2.5rem)] font-bold text-neo-cream"
      >
        {lead && (
          <li
            key={lead.id}
            data-testid="rival-ticker-item"
            data-kind="lead"
            className={cn(ITEM, 'max-w-full shrink-0 px-[1cqi]', lead.fading ? 'opacity-0' : 'motion-safe:animate-pop-in')}
          >
            <Zap className="size-[1.1em] shrink-0 text-neo-lime" aria-hidden="true" />
            <TickerAvatar item={lead} />
            <span>{t('education.rivals.ticker.flip', { name: lead.name })}</span>
          </li>
        )}
        {older.length > 0 && (
          <li className="min-w-0 flex-1">
            {/* One row tall and wrapping: a chip that does not fit drops whole instead of being cut. */}
            <ul data-testid="rival-ticker-older" className="flex h-[1.9em] min-w-0 flex-wrap items-center gap-[0.8cqi] overflow-hidden text-[0.85em]">
              {older.map((item) => (
                <li
                  key={item.id}
                  data-testid="rival-ticker-item"
                  data-kind="chip"
                  aria-label={t('education.rivals.ticker.flip', { name: item.name })}
                  className={cn(ITEM, 'h-[1.9em] shrink-0 px-[0.7cqi] text-neo-cream', item.fading ? 'opacity-0' : 'motion-safe:animate-pop-in')}
                >
                  <TickerAvatar item={item} />
                  <bdi aria-hidden="true">{item.name}</bdi>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}

const ITEM = 'flex items-center gap-[0.6cqi] rounded-neo border-2 border-neo-cream/40 bg-neo-navy py-[0.4cqi] shadow-hard-sm transition-opacity duration-700 motion-reduce:transition-none';

function TickerAvatar({ item }: { item: TickerItem }) {
  return (
    <span className="size-[1.4em] shrink-0 overflow-hidden rounded-full" aria-hidden="true">
      <Avatar
        userId={item.name}
        customAvatar={(item.avatar?.customAvatar as CustomAvatarConfig | undefined) ?? undefined}
        disableEffects
        className="!h-full !w-full"
      />
    </span>
  );
}
