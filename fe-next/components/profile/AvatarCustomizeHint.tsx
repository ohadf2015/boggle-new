'use client';

import React from 'react';
import { m } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface AvatarCustomizeHintProps {
  onCustomize: () => void;
  onDismiss: () => void;
}

/**
 * Gentle, dismissible invitation to personalize a still-default avatar.
 * Warm rather than loud (one-shot entrance, no perpetual motion) so it never
 * reads as nagging — see spec docs/2026-06-04-avatar-make-it-yours-nudge-spec.md.
 */
export function AvatarCustomizeHint({
  onCustomize,
  onDismiss,
}: AvatarCustomizeHintProps): React.ReactNode {
  const { t } = useLanguage();

  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      role="region"
      aria-label={t('avatar.nudge.title')}
      className="relative mt-4 flex items-center gap-3 rounded-neo border border-neo-cyan/30 bg-neo-cyan/[0.07] px-4 py-3"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neo-cyan/15 text-neo-cyan">
        <Sparkles size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="font-neo-display text-sm font-bold text-white">
          {t('avatar.nudge.title')}
        </p>
        <p className="text-xs text-gray-400">{t('avatar.nudge.body')}</p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onCustomize}
          className="rounded-neo border border-neo-cyan/40 bg-neo-cyan/15 px-3 py-1.5 text-xs font-bold text-neo-cyan transition-colors hover:bg-neo-cyan/25"
        >
          {t('avatar.nudge.cta')}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('avatar.nudge.dismiss')}
          className="flex items-center gap-1 rounded px-1.5 py-1 text-xs text-gray-500 transition-colors hover:text-gray-300"
        >
          <span className="hidden sm:inline">{t('avatar.nudge.dismiss')}</span>
          <X size={14} aria-hidden />
        </button>
      </div>
    </m.div>
  );
}

export default AvatarCustomizeHint;
