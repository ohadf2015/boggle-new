'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import {
  detectPreferredLanguage,
  isBrowserTranslating,
  resolveSuggestedLanguage,
  type SuggestionLanguage,
} from '@/utils/languageSuggestion';

const dismissKey = (lang: string) => `lexiclash_lang_suggestion_dismissed:${lang}`;
const EXPLICIT_KEY = 'boggle_language_explicit';

// Browser page-translation can kick in a beat after load, so re-evaluate once
// shortly after mount to catch it (the primary trigger — a differing preferred
// language with no explicit choice — already fires synchronously on mount).
const TRANSLATE_RECHECK_MS = 1500;

function readDismissed(lang: SuggestionLanguage): boolean {
  try {
    return localStorage.getItem(dismissKey(lang)) === '1';
  } catch {
    return false;
  }
}

function readExplicit(): boolean {
  try {
    return localStorage.getItem(EXPLICIT_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Decides whether to offer the player our native translation of the language
 * their browser prefers, and exposes accept/dismiss actions. See
 * `utils/languageSuggestion.ts` for the reasoning behind the heuristics.
 */
export function useNativeLanguageSuggestion(): {
  suggested: SuggestionLanguage | null;
  accept: () => void;
  dismiss: () => void;
} {
  const { language, setLanguage } = useLanguageSafe();
  const [suggested, setSuggested] = useState<SuggestionLanguage | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const evaluate = () => {
      const preferred = detectPreferredLanguage(navigator.languages);
      const result = resolveSuggestedLanguage({
        current: language,
        preferred,
        explicit: readExplicit(),
        dismissed: preferred ? readDismissed(preferred) : false,
        browserTranslating: isBrowserTranslating(document),
      });
      setSuggested(result);
    };

    evaluate();
    const timer = window.setTimeout(evaluate, TRANSLATE_RECHECK_MS);
    return () => window.clearTimeout(timer);
  }, [language]);

  const accept = useCallback(() => {
    setSuggested((current) => {
      if (current) setLanguage(current);
      return null;
    });
  }, [setLanguage]);

  const dismiss = useCallback(() => {
    setSuggested((current) => {
      if (current) {
        try {
          localStorage.setItem(dismissKey(current), '1');
        } catch {
          // ignore (private mode etc.)
        }
      }
      return null;
    });
  }, []);

  return { suggested, accept, dismiss };
}
