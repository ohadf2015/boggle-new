import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface MpHudBarProps {
  start: ReactNode;
  center: ReactNode;
  end: ReactNode;
  className?: string;
}

/**
 * The single in-game top bar: 56px phone / 64px desktop / 96px TV (64 × the
 * tv `--mp-u` of 1.5). Three grid tracks follow the document direction, so
 * start/end swap in RTL with no physical left/right anywhere.
 */
export function MpHudBar({ start, center, end, className }: MpHudBarProps) {
  return (
    <div
      data-testid="mp-hud-bar"
      className={cn(
        'grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-3',
        'h-[calc(56px*var(--mp-u,1))] lg:h-[calc(64px*var(--mp-u,1))]',
        className,
      )}
    >
      <div className="flex items-center gap-2 justify-self-start min-w-0">{start}</div>
      <div className="flex items-center gap-2 justify-self-center min-w-0">{center}</div>
      <div className="flex items-center gap-2 justify-self-end min-w-0">{end}</div>
    </div>
  );
}
