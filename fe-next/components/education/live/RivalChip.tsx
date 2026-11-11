'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import { overtakeOf, tugShare, type Overtake } from './roundBarModel';
import { setRivalPresent } from './rivalPresence';
import { ROUND_BAR_KEYFRAMES } from './roundBarStyles';
import { useRival, type RivalStatus } from './useRival';

interface RivalChipProps {
  socket: Pick<Socket, 'on' | 'off' | 'emit'> | null | undefined;
  className?: string;
}

const STATUS_TONE: Record<RivalStatus, string> = {
  ahead: 'bg-neo-lime',
  behind: 'bg-neo-pink',
  level: 'bg-neo-cream',
};

const SHAKE_MS = 700;

function useOvertake(status: RivalStatus, hasRival: boolean): Overtake | null {
  const prev = useRef<RivalStatus | null>(null);
  const [overtake, setOvertake] = useState<Overtake | null>(null);
  const { playLeadChangeSound } = useSoundEffects();

  useEffect(() => {
    if (!hasRival) {
      prev.current = null;
      return undefined;
    }
    const flip = overtakeOf(prev.current, status);
    prev.current = status;
    if (!flip) return undefined;
    setOvertake(flip);
    if (flip === 'took') playLeadChangeSound();
    const timer = window.setTimeout(() => setOvertake(null), SHAKE_MS);
    return () => window.clearTimeout(timer);
  }, [status, hasRival, playLeadChangeSound]);

  return overtake;
}

/** The duel as a tug of war: my rope from the start edge, theirs from the end, the gap in a badge. */
export default function RivalChip({ socket, className }: RivalChipProps) {
  const { t } = useLanguage();
  const { rival, diff, status, pulse, pulsing, announcement } = useRival(socket);
  const overtake = useOvertake(status, !!rival);
  const hasRival = !!rival;
  useEffect(() => {
    if (!hasRival) return undefined;
    setRivalPresent(true);
    return () => setRivalPresent(false);
  }, [hasRival]);
  if (!rival) return null;

  const number = diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : null;
  const share = tugShare(rival.myScore, rival.rivalScore);
  const avatar = rival.rivalAvatar;

  return (
    <div
      data-testid="rival-chip"
      data-status={status}
      data-overtake={overtake ?? undefined}
      role="group"
      aria-label={t(`education.rivals.aria.${status}`, { name: rival.rivalName, points: Math.abs(diff) })}
      className={cn(
        'pointer-events-none flex min-h-9 max-w-full select-none items-center gap-1.5 rounded-neo border-2 bg-neo-navy py-0.5 pe-1 ps-1 font-neo-display text-sm font-bold text-neo-cream shadow-hard-sm',
        'min-w-[8.5rem] lg:flex-wrap lg:gap-y-1 [@container(min-height:300px)]:min-h-14 [@container(min-height:300px)]:text-base',
        overtake === 'took' ? 'border-neo-lime' : overtake === 'lost' ? 'border-neo-pink' : 'border-neo-cream/40',
        overtake && 'motion-safe:animate-[edu-tug-shake_480ms_ease-out]',
        className,
      )}
    >
      <style>{ROUND_BAR_KEYFRAMES}</style>
      <span
        key={pulse}
        aria-hidden="true"
        dir="ltr"
        data-testid="rival-chip-diff"
        className={cn(
          'min-w-10 shrink-0 rounded-full border-2 border-neo-black px-2 py-0.5 text-center text-sm font-black leading-none text-neo-black tabular-nums',
          STATUS_TONE[status],
          (pulsing || overtake) && 'motion-safe:animate-neo-pop',
        )}
      >
        {number ?? t('education.rivals.level')}
      </span>
      <span className="flex min-w-12 flex-1 flex-col gap-0.5">
        <bdi
          aria-hidden="true"
          dir="auto"
          title={rival.rivalName}
          data-testid="rival-chip-short-name"
          className="hidden max-w-[12ch] truncate text-sm leading-none text-neo-cream [@container(min-height:300px)]:block lg:hidden"
        >
          {rival.rivalName.trim()}
        </bdi>
        <span aria-hidden="true" data-testid="rival-tug" className="relative h-4 w-full overflow-hidden rounded-full border-2 border-neo-black bg-neo-pink [@container(min-height:300px)]:h-6">
          <span
            data-testid="rival-tug-fill"
            className="absolute inset-y-0 start-0 bg-neo-lime transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${Math.round(share * 100)}%` }}
          />
          <span
            className="absolute inset-y-0 w-1 -translate-x-1/2 bg-neo-black rtl:translate-x-1/2 transition-[inset-inline-start] duration-500 ease-out motion-reduce:transition-none"
            style={{ insetInlineStart: `${Math.round(share * 100)}%` }}
          />
        </span>
      </span>
      <span data-testid="rival-chip-avatar" aria-hidden="true" className="grid size-7 [@container(min-height:300px)]:size-10 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-neo-cream/60 bg-neo-navy-light text-base leading-none">
        {avatar?.emoji && !avatar.avatarImage && !avatar.customAvatar ? avatar.emoji : (
          <Avatar
            userId={rival.rivalName}
            avatarImage={avatar?.avatarImage}
            customAvatar={(avatar?.customAvatar as CustomAvatarConfig | undefined) ?? undefined}
            disableEffects
            className="!h-full !w-full"
          />
        )}
      </span>
      <bdi
        aria-hidden="true"
        data-testid="rival-chip-name"
        className="hidden w-full px-1 text-sm leading-tight [overflow-wrap:anywhere] lg:block"
      >
        {t('education.rivals.vs')} {rival.rivalName}
      </bdi>
      <span data-testid="rival-chip-live" aria-live="polite" className="sr-only">
        {announcement ? t(announcement.key, { name: announcement.name }) : ''}
      </span>
    </div>
  );
}
