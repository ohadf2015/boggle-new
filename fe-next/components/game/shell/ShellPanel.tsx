'use client';

import { memo, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SHELL_ACCENTS, type ShellAccent } from './GameShell';
import styles from './gameShell.module.css';

export type ShellT = (key: string, params?: Record<string, string | number>) => string | undefined;

interface ShellPanelProps {
  title: ReactNode;
  /** Right side of the header (count pill, status). */
  aside?: ReactNode;
  /** Defaults to the shell's mode accent. */
  accent?: ShellAccent;
  /** Claim the remaining rail height (lists), instead of hugging content. */
  fill?: boolean;
  testId?: string;
  className?: string;
  children: ReactNode;
}

function ShellPanelImpl({ title, aside, accent, fill, testId, className, children }: ShellPanelProps) {
  const style = accent ? ({ '--panel-accent': SHELL_ACCENTS[accent] } as CSSProperties) : undefined;
  return (
    <section data-testid={testId} className={cn(styles.panel, fill && styles.panelFill, 'text-neo-cream', className)} style={style}>
      <header className={styles.panelHead}>
        <h2 className="min-w-0 truncate font-neo-display text-xs font-bold uppercase tracking-[0.14em] text-neo-cream/70 tv:text-lg">
          {title}
        </h2>
        {aside}
      </header>
      {children}
    </section>
  );
}

export const ShellPanel = memo(ShellPanelImpl);
ShellPanel.displayName = 'ShellPanel';
