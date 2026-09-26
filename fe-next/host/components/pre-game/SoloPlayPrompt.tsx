'use client';

import { memo } from 'react';
import { Bot } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface SoloPlayPromptProps {
  onPlayVsBots: () => void;
  t: (path: string, params?: Record<string, string | number>) => string;
  className?: string;
}

/**
 * Solo-host rescue, as one quiet status line: "No one here yet?" + a
 * PLAY VS BOTS chip that starts at once (the tap is the consent — no dialog).
 * It sits in the lobby's status lane, never as a banner competing with START.
 */
export const SoloPlayPrompt = memo<SoloPlayPromptProps>(function SoloPlayPrompt({ onPlayVsBots, t, className = '' }) {
  return (
    <div
      data-testid="solo-play-prompt"
      className={cn('flex items-center gap-2 min-w-0 rounded-neo border-2 border-neo-cyan/60 bg-neo-navy-light px-2 py-1.5', className)}
    >
      <Bot className="w-5 h-5 text-neo-cyan shrink-0" aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="font-neo-display font-bold text-[length:calc(14px*var(--mp-u,1))] leading-tight text-neo-white truncate">{t('hostView.soloPrompt.title')}</p>
        <p className="font-neo-body text-[length:calc(11px*var(--mp-u,1))] leading-tight text-neo-white/70 truncate hidden desktop-tall:block">
          {t('hostView.soloPrompt.subtitle')}
        </p>
      </div>
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
    </div>
  );
});

export default SoloPlayPrompt;
