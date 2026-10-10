'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import styles from './gameShell.module.css';

export const SHELL_ACCENTS = {
  lime: '#bfff00',
  pink: '#ff1493',
  cyan: '#00ffff',
  purple: '#8b5cf6',
  yellow: '#ffe135',
} as const;
export type ShellAccent = keyof typeof SHELL_ACCENTS;

/** Same query as the `shell` custom variant and gameShell.module.css. */
export const SHELL_MEDIA = '(min-width: 1024px) and (min-height: 600px)';

export interface GameShellProps {
  /** Mode slug, exposed as `data-game-shell` for tests and the capture rig. */
  mode: string;
  accent: ShellAccent;
  /** Desktop start rail (standings, progress, keyboard card). */
  left: ReactNode;
  /** Desktop end rail (found words). */
  right: ReactNode;
  /** The mode's own play surface — on phones it renders exactly as without the shell. */
  children: ReactNode;
  className?: string;
}

/** Layout is CSS only, so the desktop frame is right at first paint (no JS breakpoint flip). */
function GameShellImpl({ mode, accent, left, right, children, className }: GameShellProps) {
  const style = { '--shell-accent': SHELL_ACCENTS[accent] } as CSSProperties;
  return (
    <div data-testid="game-shell" data-game-shell={mode} className={cn(styles.shell, className)} style={style}>
      <aside data-testid="game-shell-left" className={cn(styles.rail, styles.railStart)}>
        {left}
      </aside>
      <div data-testid="game-shell-stage" className={styles.stage}>
        {children}
      </div>
      <aside data-testid="game-shell-right" className={cn(styles.rail, styles.railEnd)}>
        {right}
      </aside>
    </div>
  );
}

export const GameShell = memo(GameShellImpl);
GameShell.displayName = 'GameShell';
