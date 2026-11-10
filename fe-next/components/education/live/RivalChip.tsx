'use client';

import { Swords } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useRival, type RivalStatus } from './useRival';

interface RivalChipProps {
  socket: Pick<Socket, 'on' | 'off' | 'emit'> | null | undefined;
  className?: string;
}

const STATUS_TONE: Record<RivalStatus, string> = {
  ahead: 'text-neo-lime',
  behind: 'text-neo-cream',
  level: 'text-neo-cyan',
};

export default function RivalChip({ socket, className }: RivalChipProps) {
  const { t } = useLanguage();
  const { rival, diff, status, pulse, pulsing, announcement } = useRival(socket);
  if (!rival) return null;

  const number = diff > 0 ? `+${diff}` : diff < 0 ? `−${Math.abs(diff)}` : null;
  const ariaPoints = { name: rival.rivalName, points: Math.abs(diff) };

  return (
    <div
      data-testid="rival-chip"
      role="group"
      aria-label={t(`education.rivals.aria.${status}`, ariaPoints)}
      className={cn(
        'pointer-events-none inline-flex max-w-full select-none items-center gap-1.5 rounded-neo border-2 border-neo-cream/40 bg-neo-navy px-2.5 py-1 font-neo-display text-xs font-bold text-neo-cream shadow-hard-sm',
        className
      )}
    >
      <Swords className="size-3.5 shrink-0 text-neo-cream/70" aria-hidden="true" />
      <span aria-hidden="true" className="shrink-0 text-neo-cream/70">{t('education.rivals.vs')}</span>
      <span aria-hidden="true" data-testid="rival-chip-name" className="min-w-0 truncate">{rival.rivalName}</span>
      <span
        key={pulse}
        aria-hidden="true"
        dir="ltr"
        data-testid="rival-chip-diff"
        className={cn('shrink-0 tabular-nums', STATUS_TONE[status], pulsing && 'motion-safe:animate-neo-pop')}
      >
        {number ?? t('education.rivals.level')}
      </span>
      <span data-testid="rival-chip-live" aria-live="polite" className="sr-only">
        {announcement ? t(announcement.key, { name: announcement.name }) : ''}
      </span>
    </div>
  );
}
