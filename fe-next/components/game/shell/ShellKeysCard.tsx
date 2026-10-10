'use client';

import { memo } from 'react';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ShellT } from './ShellPanel';
import styles from './gameShell.module.css';

interface ShellKeysCardProps {
  t: ShellT;
  /** Esc has no meaning in a mode without a typed buffer to clear. */
  showClear?: boolean;
}

const KEY = 'inline-flex min-w-[2.75rem] items-center justify-center rounded-md border-2 border-black bg-neo-cream px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase text-black shadow-[0_3px_0_#000] tv:text-base';

/** Teaches keyboard play on desktop: the keys are drawn, not described. */
function ShellKeysCardImpl({ t, showClear = true }: ShellKeysCardProps) {
  return (
    <div data-testid="shell-keys" className="mt-auto flex flex-col gap-2 rounded-[14px] border-3 border-dashed border-neo-cream/25 px-3.5 py-3 text-neo-cream/80">
      <p className="flex items-center gap-2 font-neo-display text-xs font-bold uppercase tracking-[0.14em] tv:text-lg">
        <Keyboard className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('gameShell.keys.title')}
      </p>
      <ul className="flex flex-col gap-1.5 text-xs font-semibold tv:text-base">
        <li className="flex items-center justify-between gap-2">
          <span>{t('gameShell.keys.type')}</span>
          <kbd className={cn(KEY, 'min-w-[4.5rem]', styles.keyPress)}>{t('gameShell.keys.letters')}</kbd>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span>{t('gameShell.keys.submit')}</span>
          <kbd className={KEY}>Enter</kbd>
        </li>
        {showClear && (
          <li className="flex items-center justify-between gap-2">
            <span>{t('gameShell.keys.clear')}</span>
            <kbd className={KEY}>Esc</kbd>
          </li>
        )}
      </ul>
    </div>
  );
}

export const ShellKeysCard = memo(ShellKeysCardImpl);
ShellKeysCard.displayName = 'ShellKeysCard';
