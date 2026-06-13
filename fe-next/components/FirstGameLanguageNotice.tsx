'use client';

import { useEffect } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { Gamepad2, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFirstGameLanguageNotice } from '@/hooks/useFirstGameLanguageNotice';
import { useNativeLanguageSuggestion } from '@/hooks/useNativeLanguageSuggestion';
import { SUGGESTION_COPY, type SuggestionLanguage } from '@/utils/languageSuggestion';
import { QuickLanguageSwitcher } from '@/components/QuickLanguageSwitcher';

/**
 * One-time, first-game banner emphasising which language the player is playing
 * in — and offering a one-tap switch. Surfaced because we now silently route
 * close-but-unshipped browser languages to a neighbouring bundle (a Brazilian
 * browser lands on Spanish, not English); this makes that routing visible and
 * reversible. The language autonym (e.g. "Español") is rendered `translate="no"`
 * so the browser doesn't mangle it.
 */
export function FirstGameLanguageNotice() {
  const { visible, language, dismiss } = useFirstGameLanguageNotice();
  const { suggested } = useNativeLanguageSuggestion();
  const { t } = useLanguage();

  // Defer to the native-language banner when it is offering a switch: it shares
  // this fixed top-0 slot AND is strictly more actionable (it switches to the
  // language the browser actually prefers). This is exactly the stuck-Brazilian
  // case — en cookie, pt browser — where both would otherwise stack.
  const show = visible && !suggested;

  // Auto-dismiss after a brief read window. As an in-flow banner it reserves
  // layout height while shown (shrinking the play area); auto-dismissing returns
  // that space and guarantees it never lingers over gameplay controls.
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(dismiss, 7000);
    return () => clearTimeout(timer);
  }, [show, dismiss]);

  // language is always one of our five shipped locales -> safe index.
  const nativeName = SUGGESTION_COPY[language as SuggestionLanguage]?.nativeName ?? language;

  return (
    <AnimatePresence>
      {show && (
        <m.div
          role="status"
          aria-live="polite"
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="relative z-50 w-full shrink-0 flex items-center gap-3 bg-accent text-accent-foreground border-b-neo border-neo-navy px-4 py-2 shadow-hard"
        >
          <Gamepad2 className="size-5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <span className="font-neo-display text-sm font-bold">
              {t('settings.firstGamePlayingIn', { language: nativeName })}
            </span>
          </div>
          <QuickLanguageSwitcher compact />
          <button
            type="button"
            onClick={dismiss}
            aria-label={t('settings.firstGameDismiss')}
            title={t('settings.firstGameDismiss')}
            className="shrink-0 rounded-neo border-neo border-neo-navy bg-neo-cream/40 hover:bg-neo-cream/60 active:translate-y-px px-2 py-1"
          >
            <X className="size-4" aria-hidden />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default FirstGameLanguageNotice;
