import type { ReactNode } from 'react';

export type MpDesktopMode = 'classic' | 'wheel-rush' | 'blast' | 'word-hunt';

export interface ShellSlots {
  left: {
    roster: ReactNode;
    modeBadge: ReactNode;
    secondary?: ReactNode;
  };
  center: ReactNode;
  right: {
    wordsLadder: ReactNode;
    activityStream?: ReactNode;
    chat?: ReactNode;
  };
  meta: { mode: MpDesktopMode; roomId: string };
}
