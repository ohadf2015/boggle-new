'use client';

import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  onDismiss: () => void;
}

/**
 * 2-second celebration overlay shown when the player discovers the hidden
 * Wildcard Catalyst word in Word Alchemy. Auto-dismisses via `onDismiss`.
 *
 * `pointer-events-none` so the puzzle board remains usable while the
 * overlay is visible. No z-index war — fixed at z-50.
 */
export function WildcardFoundModal({ onDismiss }: Props) {
  const { t } = useLanguage();

  useEffect(() => {
    const id = setTimeout(onDismiss, 2000);
    return () => clearTimeout(id);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
    >
      <div className="animate-neo-pop motion-reduce:animate-none rounded-neo border-3 border-black bg-neo-purple px-8 py-6 shadow-hard-lg text-center space-y-2 max-w-xs mx-4">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
          <span className="font-neo-display font-black text-xl uppercase tracking-wide text-neo-yellow">
            {t('wordAlchemy.wildcardFound')}
          </span>
          <Sparkles className="h-5 w-5 text-neo-yellow" strokeWidth={2.5} aria-hidden="true" />
        </div>
        <p className="font-neo-body text-sm text-neo-white/90">
          {t('wordAlchemy.wildcardSkip')}
        </p>
      </div>
    </div>
  );
}
