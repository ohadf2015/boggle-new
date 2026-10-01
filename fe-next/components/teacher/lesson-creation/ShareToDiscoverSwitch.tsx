'use client';

import { Globe2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { ModerationIssue } from '@/lib/education/library';

interface ShareToDiscoverSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  issues?: ModerationIssue[];
  disabled?: boolean;
}

export default function ShareToDiscoverSwitch({ checked, onChange, issues = [], disabled }: ShareToDiscoverSwitchProps) {
  const { t } = useLanguage();
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-neo border-2 p-3 transition-colors',
        checked ? 'border-neo-lime bg-neo-lime/10' : 'border-neo-cream/40 bg-neo-black/20',
      )}
    >
      <Globe2 className={cn('mt-0.5 size-5 shrink-0', checked ? 'text-neo-lime' : 'text-neo-white/60')} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p id="share-discover-label" className="font-neo-display text-sm font-bold text-neo-white">
          {t('eduLibrary.share.toggle')}
        </p>
        <p className="text-xs text-neo-white/75 text-pretty">{t('eduLibrary.share.help')}</p>
        {checked && issues.length > 0 && (
          <p role="alert" className="mt-1 text-xs font-bold text-neo-pink">
            {t('eduLibrary.share.blocked')}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby="share-discover-label"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full border-3 border-neo-black shadow-hard-sm transition-colors',
          'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan disabled:opacity-50',
          checked ? 'bg-neo-lime' : 'bg-neo-navy-light',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-0.5 size-5 rounded-full border-2 border-neo-black bg-neo-cream transition-all duration-200',
            checked ? 'start-[1.6rem]' : 'start-0.5',
          )}
        />
      </button>
    </div>
  );
}
