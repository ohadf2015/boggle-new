'use client';

import { memo } from 'react';
import { Bot } from 'lucide-react';
import { cn } from '../../../lib/utils';
import Mascot from '@/components/ui/Mascot';
import { LobbyQuip } from '@/components/multiplayer/lobby/LobbyQuip';

interface SoloPlayPromptProps {
  /** Omitted when START itself already starts vs bots: one action, not two. */
  onPlayVsBots?: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

/**
 * Solo-host rescue in the status lane: the hopping mascot, "No one here yet?"
 * with a rotating one-liner, and a PLAY VS BOTS chip that starts at once (the
 * tap is the consent, no dialog). Never a banner competing with START.
 */
export const SoloPlayPrompt = memo<SoloPlayPromptProps>(function SoloPlayPrompt({ onPlayVsBots, t, className = '' }) {
  return (
    <div
      data-testid="solo-play-prompt"
      className={cn('flex items-center gap-2 min-w-0 rounded-neo border-2 border-neo-black bg-neo-navy-light ps-1 pe-2 py-1 shadow-hard-sm', className)}
    >
      <span data-testid="solo-mascot" className="shrink-0 -rotate-6">
        <Mascot variant="waiting" size="xs" animated={false} alt="" className="!w-[calc(40px*var(--mp-u,1))] !h-[calc(40px*var(--mp-u,1))]" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-neo-display font-bold text-[length:calc(14px*var(--mp-u,1))] leading-tight text-neo-white truncate">{t('hostView.soloPrompt.title')}</p>
        <LobbyQuip t={t} className="font-neo-body font-bold text-[length:calc(12px*var(--mp-u,1))] leading-tight text-neo-cyan truncate" />
      </div>
      {onPlayVsBots && (
      <button
        type="button"
        onClick={onPlayVsBots}
        className={cn(
          'shrink-0 h-[calc(36px*var(--mp-u,1))] px-3 flex items-center gap-1.5 rounded-neo border-2 border-neo-black bg-neo-cyan text-neo-black',
          'font-neo-display font-bold text-[length:calc(14px*var(--mp-u,1))] uppercase shadow-hard-sm transition-transform active:translate-y-0.5 active:shadow-none',
          'focus-visible:outline-hidden focus-visible:ring-4 focus-visible:ring-neo-white',
        )}
      >
        <Bot className="w-4 h-4" aria-hidden="true" />
        <span>{t('hostView.soloPrompt.cta')}</span>
      </button>
      )}
    </div>
  );
});

export default SoloPlayPrompt;
