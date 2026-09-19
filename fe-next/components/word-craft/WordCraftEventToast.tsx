'use client';

import { cn } from '@/lib/utils';

export interface WordCraftToast {
  key: number;
  tone: 'bot' | 'player' | 'gold';
  text: string;
  detail?: string;
  /** Auto-dismiss delay (ms); the screen owns the timer. */
  ms?: number;
}

const TONE: Record<WordCraftToast['tone'], string> = {
  bot: 'bg-neo-pink text-neo-white',
  player: 'bg-neo-cyan text-neo-navy',
  gold: 'bg-neo-yellow text-neo-navy',
};

/**
 * Transient turn-event banner pinned over the top of the board: bot skipped /
 * swapped / passed, surprise-box reveals. Overlay only — never reflows the board.
 */
export function WordCraftEventToast({ toast }: { toast: WordCraftToast | null }) {
  if (!toast) return null;
  return (
    <div
      key={toast.key}
      role="status"
      data-tone={toast.tone}
      className={cn(
        'pointer-events-none absolute left-1/2 -translate-x-1/2 top-2 z-30 max-w-[92%] px-3 py-1.5 text-center',
        'border-neo-thick border-black rounded-neo shadow-hard-lg animate-neo-pop',
        'font-neo-display font-black uppercase tracking-wider text-sm leading-tight',
        TONE[toast.tone],
      )}
    >
      {toast.text}
      {toast.detail ? <span className="block text-xs normal-case tracking-normal">{toast.detail}</span> : null}
    </div>
  );
}
