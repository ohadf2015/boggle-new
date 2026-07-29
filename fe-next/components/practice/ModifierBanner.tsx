'use client';

import React from 'react';
import { Target } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { PracticeModifier } from '@/lib/practice/modifiers';

interface ModifierBannerProps {
  modifier: PracticeModifier;
  className?: string;
}

/**
 * Renders the daily practice modifier as a chip strip:
 * "Today's twist · [LABEL] — [DESC]  [×N bonus]"
 *
 * Uses i18n keys from the modifier itself; never hardcodes id branches.
 * Mount once at top of practice game shell.
 */
export function ModifierBanner({ modifier, className }: ModifierBannerProps): React.JSX.Element {
  const { t, dir } = useLanguage();
  const label = t(modifier.labelKey);
  const desc = t(modifier.descKey);
  const bonus = t('practice.modifier.bonus', { x: String(modifier.bonusMultiplier) });

  return (
    <div
      data-testid="modifier-banner"
      data-modifier-id={modifier.id}
      dir={dir}
      className={[
        'flex items-center gap-3 rounded-neo border-3 border-neo-black',
        'bg-neo-purple px-4 py-3 text-neo-black shadow-hard',
        className ?? '',
      ].join(' ')}
    >
      <Target aria-hidden className="w-5 h-5 shrink-0" strokeWidth={2.5} />
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase tracking-wide opacity-70">
          {t('practice.modifier.todayLabel')}
        </div>
        <div className="font-neo-display font-black text-base leading-tight">{label}</div>
        <div className="text-xs font-bold opacity-80">{desc}</div>
      </div>
      <span className="rounded-full border-2 border-neo-black bg-neo-yellow px-3 py-1 font-black text-sm">
        {bonus}
      </span>
    </div>
  );
}

export default ModifierBanner;
