'use client';

import { Bot, RotateCcw } from 'lucide-react';
import { NeoButton } from '@/components/ui/button';
import { NeoPanel } from '@/components/ui/panel';
import type { Translate } from './eduLiveStyles';

interface PracticeSeatTimeoutNoticeProps {
  onBotsOnly: () => void;
  onRetry: () => void;
  t: Translate;
}

/** Shown when "Try it as a student" waited and the teacher's student seat never joined the room. */
export function PracticeSeatTimeoutNotice({ onBotsOnly, onRetry, t }: PracticeSeatTimeoutNoticeProps) {
  return (
    <NeoPanel
      tone="yellow"
      shadow="lg"
      role="alert"
      data-testid="practice-seat-timeout"
      className="fixed inset-x-3 bottom-[calc(var(--lc-teacher-bar-h,0px)+0.75rem)] z-50 mx-auto flex max-w-xl flex-wrap items-center gap-3 p-3"
    >
      <p className="min-w-0 flex-1 basis-56 font-neo-body text-sm font-bold leading-snug">{t('eduLiveRoom.practice.seatTimeout')}</p>
      <div className="flex flex-wrap gap-2">
        <NeoButton variant="small" tone="lime" data-testid="practice-seat-bots-only" onClick={onBotsOnly}>
          <Bot className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.practice.botsOnly')}
        </NeoButton>
        <NeoButton variant="small" tone="cream" data-testid="practice-seat-retry" onClick={onRetry}>
          <RotateCcw className="size-4" aria-hidden="true" />
          {t('eduLiveRoom.practice.retry')}
        </NeoButton>
      </div>
    </NeoPanel>
  );
}

export default PracticeSeatTimeoutNotice;
