'use client';

import { ArrowLeft, Home, LogOut } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface MpBackButtonProps {
  onPress: () => void;
  /** `back` arrow (previous MP state) · `home` (leave MP from entry) · `leave` (leave the room). */
  kind: 'back' | 'home' | 'leave';
  className?: string;
}

const LABEL = { back: 'mpUi.shell.back', home: 'mpUi.shell.home', leave: 'mpUi.shell.leave' } as const;

/**
 * The header exit control. Wire `onPress` to `useMpExit()` — never a raw
 * Link/router.push to a non-MP route. Arrows are DirectionalIcon (RTL-aware).
 */
export function MpBackButton({ onPress, kind, className }: MpBackButtonProps) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onPress}
      aria-label={t(LABEL[kind])}
      data-testid={`mp-back-${kind}`}
      className={cn(
        'inline-flex items-center justify-center w-11 h-11 tv:w-16 tv:h-16 shrink-0 rounded-neo border-2 border-neo-black bg-neo-navy-light text-neo-white shadow-hard-sm',
        className,
      )}
    >
      {kind === 'home' ? (
        <Home aria-hidden="true" className="w-5 h-5" />
      ) : (
        <DirectionalIcon icon={kind === 'leave' ? LogOut : ArrowLeft} mirror={kind === 'leave'} className="w-5 h-5" />
      )}
    </button>
  );
}
