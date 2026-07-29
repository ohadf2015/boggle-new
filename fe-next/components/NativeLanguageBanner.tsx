'use client';

import { m, AnimatePresence } from 'framer-motion';
import { Languages, X } from 'lucide-react';
import { useNativeLanguageSuggestion } from '@/hooks/useNativeLanguageSuggestion';
import { SUGGESTION_COPY } from '@/utils/languageSuggestion';

/**
 * Offers a one-tap switch to our native translation when the player's browser
 * prefers a language we ship natively but the app is showing another one
 * (e.g. a US-based Spanish speaker served English, whom Chrome would otherwise
 * machine-translate). Copy is rendered in the *target* language.
 *
 * The banner is itself `translate="no"` — it is already in the target language
 * and must not be re-translated by the browser (which would also expose it to
 * the DOM-mutation crashes the offer exists to avoid).
 */
export function NativeLanguageBanner() {
  const { suggested, accept, dismiss } = useNativeLanguageSuggestion();
  const copy = suggested ? SUGGESTION_COPY[suggested] : null;

  return (
    <AnimatePresence>
      {suggested && copy && (
        <m.div
          role="status"
          aria-live="polite"
          lang={suggested}
          translate="no"
          initial={{ y: -32, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -32, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="notranslate relative z-50 w-full shrink-0 flex items-center gap-3 bg-neo-cyan text-neo-navy border-b-neo border-neo-navy px-4 py-2 shadow-hard"
        >
          <Languages className="size-5 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0">
            <span className="font-neo-display text-sm font-bold">{copy.prompt}</span>
          </div>
          <button
            type="button"
            onClick={accept}
            className="shrink-0 rounded-neo border-neo border-neo-navy bg-neo-lime hover:bg-neo-lime/80 active:translate-y-px px-3 py-1 font-bold text-sm"
          >
            {copy.accept}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={copy.dismiss}
            title={copy.dismiss}
            className="shrink-0 rounded-neo border-neo border-neo-navy bg-neo-cream/40 hover:bg-neo-cream/60 active:translate-y-px px-2 py-1"
          >
            <X className="size-4" aria-hidden />
          </button>
        </m.div>
      )}
    </AnimatePresence>
  );
}

export default NativeLanguageBanner;
