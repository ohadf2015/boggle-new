'use client';

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBoostStatus } from '@/hooks/useBoostStatus';
import { BoostPicker } from './BoostPicker';

interface Props {
  mode: 'mp' | 'sp' | 'drill' | 'classic';
  sessionId: string;
  disabled?: boolean;
}

export function BoostButton({ mode, sessionId, disabled }: Props) {
  const { t } = useLanguage();
  const { status } = useBoostStatus();
  const [open, setOpen] = useState(false);

  const remaining = status?.remaining ?? 0;
  const isDisabled = disabled || remaining === 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={isDisabled}
        aria-label={t('boosts.openPickerAria').replace('{{n}}', String(remaining))}
        className="rounded-neo border-neo bg-neo-pink px-4 py-2 font-neo-display text-neo-cream shadow-hard hover:active:shadow-hard-pressed disabled:opacity-50"
      >
        {t('boosts.cta')} <span className="text-xs opacity-80">({remaining})</span>
      </button>
      {open && <BoostPicker open={open} mode={mode} sessionId={sessionId} onClose={() => setOpen(false)} />}
    </>
  );
}
