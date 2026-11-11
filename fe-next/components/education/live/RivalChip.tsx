'use client';

import type { Socket } from 'socket.io-client';
import Avatar from '@/components/Avatar';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
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

export default function RivalChip({ socket, className }: RivalChipProps) {
  const { t } = useLanguage();
  const { rival, diff, status, pulse, pulsing, announcement } = useRival(socket);
  if (!rival) return null;

  const number = diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : null;
  const ariaPoints = { name: rival.rivalName, points: Math.abs(diff) };
  const avatar = rival.rivalAvatar;

  return (
    <div
      data-testid="rival-chip"
      role="group"
      aria-label={t(`education.rivals.aria.${status}`, ariaPoints)}
      className={cn(
        'pointer-events-none flex min-h-9 max-w-full select-none items-center gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy py-0.5 pe-1 ps-1 font-neo-display text-sm font-bold text-neo-cream shadow-hard-sm',
        className
      )}
    >
      <span data-testid="rival-chip-avatar" aria-hidden="true" className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-neo-cream/60 bg-neo-navy-light text-base leading-none">
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
      <span aria-hidden="true" className="shrink-0 text-[13px] text-neo-cream/70">{t('education.rivals.vs')}</span>
      <bdi aria-hidden="true" data-testid="rival-chip-name" className="min-w-0 flex-1 truncate">{rival.rivalName}</bdi>
      <span
        key={pulse}
        aria-hidden="true"
        dir="ltr"
        data-testid="rival-chip-diff"
        className={cn(
          'shrink-0 rounded-full border-2 border-neo-black px-2 py-0.5 text-sm font-black leading-none text-neo-black tabular-nums',
          STATUS_TONE[status],
          pulsing && 'motion-safe:animate-neo-pop',
        )}
      >
        {number ?? t('education.rivals.level')}
      </span>
      <span data-testid="rival-chip-live" aria-live="polite" className="sr-only">
        {announcement ? t(announcement.key, { name: announcement.name }) : ''}
      </span>
    </div>
  );
}
