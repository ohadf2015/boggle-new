'use client';

/**
 * Profile-page entry point for picking a music/theme style. Shows the current
 * style (mascot + name) and opens the full StylePicker in a modal. Admin-gated
 * (hidden when the feature is disabled). Reuses existing i18n keys.
 */

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { m } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePlayerStyle } from '@/contexts/PlayerStyleContext';

const PlayerStyleModal = dynamic(
  () => import('@/components/playerStyle/PlayerStyleModal').then((mod) => mod.PlayerStyleModal),
  { ssr: false },
);

export function ProfileStyleCard({
  isDarkMode = true,
  delay = 0,
}: {
  isDarkMode?: boolean;
  delay?: number;
}) {
  const { t } = useLanguage();
  const { enabled, style } = usePlayerStyle();
  const [open, setOpen] = useState(false);

  if (!enabled) return null;

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="mb-4"
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'flex w-full items-center gap-3 rounded-neo border-neo-thick border-neo-black p-3 text-start shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-0',
          isDarkMode ? 'bg-neo-navy-light' : 'bg-white',
        )}
      >
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-neo border-neo border-neo-black bg-neo-navy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={style.mascot} alt="" className="h-full w-full object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 font-neo-display text-sm font-black uppercase text-neo-cream">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            {t('playerStyle.settings.title')}
          </span>
          <span className="block truncate font-neo-body text-xs text-neo-cream/70">
            {style.emoji} {t(style.labelKey)} · {t('playerStyle.settings.description')}
          </span>
        </span>
        <span className="shrink-0 rounded-neo border-neo border-neo-black bg-accent px-2.5 py-1 font-neo-display text-xs font-bold text-neo-black">
          {t('playerStyle.picker.title')}
        </span>
      </button>

      {open && <PlayerStyleModal isOpen onDismiss={() => setOpen(false)} />}
    </m.div>
  );
}

export default ProfileStyleCard;
