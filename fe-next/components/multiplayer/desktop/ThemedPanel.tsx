import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { getMpTheme } from '@/lib/multiplayer/desktopThemes';
import type { MpDesktopMode } from './types';

export type ThemedPanelVariant = 'rail' | 'badge' | 'chip' | 'flat';

interface ThemedPanelProps {
  mode: MpDesktopMode;
  variant?: ThemedPanelVariant;
  header?: string;
  headerRight?: ReactNode;
  children: ReactNode;
  className?: string;
  withTexture?: boolean;
  testId?: string;
}

const VARIANT_CLASS: Record<ThemedPanelVariant, string> = {
  rail: 'p-3 rounded-xl',
  badge: 'p-3 rounded-xl',
  chip: 'px-2 py-1 rounded-md text-xs',
  flat: 'p-2 rounded-md',
};

export function ThemedPanel({
  mode,
  variant = 'rail',
  header,
  headerRight,
  children,
  className,
  withTexture = true,
  testId,
}: ThemedPanelProps) {
  const theme = getMpTheme(mode);
  return (
    <div
      data-component="themed-panel"
      data-mode={mode}
      data-variant={variant}
      data-testid={testId}
      className={cn(
        'relative border-2 bg-card overflow-hidden',
        VARIANT_CLASS[variant],
        theme.borderClass,
        theme.shadowClass,
        className,
      )}
    >
      {withTexture && (
        <div
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 opacity-[0.06]',
            theme.textureClass,
          )}
        />
      )}
      {header && (
        <div className="relative flex items-center justify-between mb-2">
          <span
            data-testid={testId ? `${testId}-header` : undefined}
            className={cn(
              'inline-block px-1.5 py-0.5 text-[10px] font-neo-display font-bold uppercase tracking-widest',
              theme.bgTintClass,
              theme.textClass,
              'border',
              theme.borderClass,
              'rounded-sm',
            )}
          >
            {header}
          </span>
          {headerRight && <span className="text-xs opacity-70">{headerRight}</span>}
        </div>
      )}
      <div className="relative">{children}</div>
    </div>
  );
}
