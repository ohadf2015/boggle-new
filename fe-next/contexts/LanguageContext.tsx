'use client';

import { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { locales, defaultLocale } from '../lib/i18n';
import { matchLanguageList } from '../lib/localeResolution';
import { loadTranslation, getCachedTranslation, seedTranslationCache, type TranslationData } from '../translations/loadTranslation';
import logger from '@/utils/logger';
import { trackTelemetryEvent } from '@/utils/sentry';
import { hasSupabaseSession } from '@/utils/onboardingStorage';
import type { Language } from '@/types';

interface LanguageContextValue {
  language: Language;
  setLanguage: (newLang: Language, options?: { skipNavigation?: boolean }) => void;
  /**
   * Translate a key with optional fallback and interpolation params.
   * @param path - The translation key path (e.g., 'errors.networkError')
   * @param fallbackOrParams - Either a fallback string or interpolation params object
   * @param paramsWhenFallback - Interpolation params when first arg is a fallback string
   *
   * Usage examples:
   * - Basic: translateFn('common.save')
   * - With params: translateFn('common.loading', { count: 5 })
   * - With fallback: translateFn('common.error', 'Something went wrong')
   */
  t: (path: string, fallbackOrParams?: string | Record<string, string | number>, paramsWhenFallback?: Record<string, string | number>) => string;
  dir: 'rtl' | 'ltr';
  currentFlag: string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

// Fallback flags used only until the active language's translation bundle
// (which carries its own `flag`) finishes loading. Keyed by language so a
// non-Hebrew user never briefly sees the Israeli flag as the default.
const FLAG_BY_LANGUAGE: Record<string, string> = {
    en: '🇺🇸', he: '🇮🇱', sv: '🇸🇪', ja: '🇯🇵', es: '🇪🇸', ru: '🇷🇺',
};

/**
 * Replace ${var}, {{var}}, and {var} placeholders with params. Applied at every
 * `t()` return point — including the fallback branches — so a fallback string
 * with placeholders never leaks literal "{done}"/"{total}" text just because
 * the real translation key was missing or not loaded yet.
 */
function interpolate(template: string, params: Record<string, string | number>): string {
    if (Object.keys(params).length === 0) return template;
    let result = template.replace(/\$\{(\w+)\}/g, (match, key) => (
        params[key] !== undefined ? String(params[key]) : match
    ));
    result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => (
        params[key] !== undefined ? String(params[key]) : match
    ));
    result = result.replace(/\{(\w+)\}/g, (match, key) => (
        params[key] !== undefined ? String(params[key]) : match
    ));
    return result;
}

const parseLocaleFromPath = (pathname: string): Language | null => {
    if (!pathname) return null;
    const segments = pathname.split('/');
    const locale = segments[1];
    return locales.includes(locale as Language) ? (locale as Language) : null;
};

// Map browser language codes to supported locales. Uses the shared resolver so
// close-but-unshipped languages map to a native bundle (e.g. a pt-BR browser
// resolves to our Spanish bundle, not the English default).
const getBrowserLanguage = (): Language | null => {
    if (typeof window === 'undefined' || !navigator) return null;
    const browserLanguages = navigator.languages || [navigator.language];
    return matchLanguageList(browserLanguages) as Language | null;
};

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
  /** Pre-loaded translation data for the initial language (avoids async load on mount) */
  initialTranslations?: TranslationData;
}

export const LanguageProvider = ({ children, initialLanguage, initialTranslations }: LanguageProviderProps) => {
    const router = useRouter();
    const pathname = usePathname();

    // Get locale from cookie (works on client-side)
    const getCookieLocale = (cookieName: string): Language | null => {
        if (typeof document === 'undefined') return null;
        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === cookieName && locales.includes(value as Language)) {
                return value as Language;
            }
        }
        return null;
    };

    // Determine initial language - only use server-safe values
    const getServerSafeLanguage = (): Language => {
        // Use initialLanguage prop if provided (from server)
        if (initialLanguage) return initialLanguage;
        // Use pathname locale if available
        if (pathname) {
            const pathLocale = parseLocaleFromPath(pathname);
            if (pathLocale) return pathLocale;
        }
        return defaultLocale;
    };

    // Initialize with server-safe value to avoid hydration mismatch
    const [language, setLanguageState] = useState<Language>(getServerSafeLanguage);
    const mountedRef = useRef(false);
    const languageRef = useRef(language);

    // Seed the cache with initial translations if provided (avoids async load for first language)
    if (initialTranslations && initialLanguage) {
        seedTranslationCache(initialLanguage, initialTranslations);
    }

    // Dynamic translation state — only the active language is loaded
    const [currentTranslations, setCurrentTranslations] = useState<TranslationData | undefined>(
        () => initialTranslations || getCachedTranslation(getServerSafeLanguage())
    );

    // Ref to avoid re-creating t() on every translation load (prevents app-wide render storm).
    // The t() function reads from this ref instead of closing over state, so its identity
    // stays stable even when translations load asynchronously.
    const translationsRef = useRef(currentTranslations);
    translationsRef.current = currentTranslations;

    // Bump counter once when translations finish loading to update dir/flag in context.
    // This triggers exactly ONE re-render per language switch, not per-state-update.
    const [translationsReady, setTranslationsReady] = useState(() => !!currentTranslations);

    // Load translations when language changes or on first mount when no initialTranslations
    useEffect(() => {
        const cached = getCachedTranslation(language);
        if (cached) {
            if (cached !== currentTranslations) {
                setCurrentTranslations(cached);
                setTranslationsReady(true);
            }
            return;
        }
        setTranslationsReady(false);
        // Async load for language switch (or first mount without initialTranslations)
        loadTranslation(language).then((data) => {
            setCurrentTranslations(data);
            setTranslationsReady(true);
        }).catch((err) => {
            logger.warn(`Failed to load translations for ${language}:`, err);
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language]);

    // Keep ref in sync
    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // After mount, reconcile URL locale with user's explicit saved preference.
    // Android WebView cold-starts at `/` → server falls back to Accept-Language
    // (device locale) when cookie is absent/pruned, overwriting user's choice.
    // Fix: if user explicitly selected a language (flag set), that wins over URL.
    useEffect(() => {
        mountedRef.current = true;

        // The server already resolved the locale (redirect → /[locale] → initialLanguage).
        // Treat that as authoritative even if usePathname() is momentarily empty on the
        // first client render. Without this, a falsy pathname dropped us into the
        // browser-language branch below and flipped Hebrew-browser users to /he on a
        // correct /en URL — the "everyone gets Hebrew" regression.
        const urlLocale =
            (initialLanguage && locales.includes(initialLanguage) ? initialLanguage : null)
            ?? (pathname ? parseLocaleFromPath(pathname) : null);
        const savedLanguage = localStorage.getItem('boggle_language');
        const explicit = localStorage.getItem('boggle_language_explicit') === '1';
        const currentLang = languageRef.current;

        if (urlLocale) {
            // User's explicit pick overrides URL locale guessed by server.
            if (
                explicit &&
                savedLanguage &&
                locales.includes(savedLanguage as Language) &&
                savedLanguage !== urlLocale
            ) {
                const segments = pathname.split('/');
                segments[1] = savedLanguage;
                const newPath = segments.join('/') || `/${savedLanguage}`;
                setLanguageState(savedLanguage as Language);
                router.replace(newPath);
            }
            return;
        }

        // No URL locale — use saved preference or browser fallback
        if (savedLanguage && locales.includes(savedLanguage as Language)) {
            if (savedLanguage !== currentLang) {
                setLanguageState(savedLanguage as Language);
            }
            return;
        }

        const browserLang = getBrowserLanguage();
        if (browserLang && browserLang !== currentLang) {
            setLanguageState(browserLang);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount

    // Sync language when pathname or initialLanguage changes (after mount)
    useEffect(() => {
        if (!mountedRef.current) return;
        const newLang = initialLanguage || (pathname ? parseLocaleFromPath(pathname) : null);
        if (newLang && newLang !== languageRef.current) {
            setLanguageState(newLang);
        }
    }, [initialLanguage, pathname]);

    useEffect(() => {
        // Save to localStorage AND cookie (middleware reads cookie)
        if (typeof window !== 'undefined') {
            localStorage.setItem('boggle_language', language);
            // Set cookie with 1-year expiry for server-side middleware
            document.cookie = `boggle_language=${language}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
        }
    }, [language]);

    // Auto-sync current language to profiles.language for server-side push
    // localization. `explicit: false` tells the API "fill if NULL, don't
    // clobber" — otherwise visiting /en/anything would silently overwrite
    // a Hebrew speaker's stored preference and route every push in English.
    // Deliberate switcher clicks go through setLanguage() with explicit:true.
    // 401 (anonymous) leaves the dedup gate UNSET so a later post-login mount retries.
    useEffect(() => {
        if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
        const key = `boggle_language_synced:${language}`;
        let alreadySynced = false;
        try {
            alreadySynced = sessionStorage.getItem(key) === '1';
        } catch {
            // sessionStorage unavailable (private mode etc.) — fall through and POST
        }
        if (alreadySynced) return;
        if (!hasSupabaseSession()) return;
        fetch('/api/user/language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ language, explicit: false }),
        })
            .then((res) => {
                if (res.ok) {
                    try { sessionStorage.setItem(key, '1'); } catch { /* ignore */ }
                }
            })
            .catch(() => { /* non-blocking */ });
    }, [language]);

    const setLanguage = useCallback((newLang: Language, options?: { skipNavigation?: boolean }) => {
        if (newLang !== languageRef.current) {
            setLanguageState(newLang);

            // Mark as explicit user choice — mount effect uses this to override
            // server-guessed URL locale (Accept-Language) on Android WebView cold start.
            if (typeof window !== 'undefined') {
                localStorage.setItem('boggle_language_explicit', '1');
            }

            // Also update cookie immediately for server-side consistency
            if (typeof document !== 'undefined') {
                document.cookie = `boggle_language=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
                document.cookie = `boggle_language_explicit=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
            }

            // Fire-and-forget: persist to profiles.language so per-recipient push
            // notifications can be localized server-side. `explicit:true` lets the
            // API overwrite any prior auto-synced value — switcher click is the
            // user's deliberate intent and must win over URL/cookie heuristics.
            if (typeof fetch !== 'undefined' && hasSupabaseSession()) {
                // Reset session dedup so the auto-sync effect won't bail on the next
                // mount, and so subsequent re-mounts re-confirm the explicit choice.
                try { sessionStorage.removeItem(`boggle_language_synced:${newLang}`); } catch { /* ignore */ }
                fetch('/api/user/language', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ language: newLang, explicit: true }),
                }).catch(() => { /* non-blocking */ });
            }

            // Caller can opt out of the immediate router.push — used by the FTUE
            // language step, where router.push remounts [locale]/PageClient and
            // resets the FTUE back to 'language' (infinite loop). Cookie + state
            // are already updated above so subsequent navigations use new locale.
            if (options?.skipNavigation) {
                return;
            }

            // Navigate to new locale preserving FULL path (everything after locale)
            const segments = pathname.split('/');
            // segments[0] is empty string, segments[1] is locale
            const currentLocale = segments[1];

            if (locales.includes(currentLocale as Language)) {
                segments[1] = newLang;
                // Join segments and ensure we have a valid path
                const newPath = segments.join('/') || `/${newLang}`;
                router.push(newPath);
            } else {
                // Fallback if locale is missing (shouldn't happen with middleware)
                router.push(`/${newLang}${pathname}`);
            }
        }
    }, [pathname, router]);

    // Memoize t function to prevent unnecessary re-renders of consumers
    // Supports: translateFn(path), translateFn(path, params), translateFn(path, fallback), translateFn(path, fallback, params)
    const t = useCallback((
        path: string,
        fallbackOrParams?: string | Record<string, string | number>,
        paramsWhenFallback?: Record<string, string | number>
    ): string => {
        // Determine fallback and params based on argument types
        const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
        const params: Record<string, string | number> = typeof fallbackOrParams === 'object' && fallbackOrParams !== null
            ? fallbackOrParams
            : (paramsWhenFallback || {});

        const keys = path.split('.');
        // Read from ref to avoid depending on currentTranslations state
        let current: unknown = translationsRef.current;

        if (!current) {
            // Translations not loaded yet — return fallback or key, still interpolated
            return interpolate(fallback || path, params);
        }

        for (const key of keys) {
            if (typeof current !== 'object' || current === null || !(key in current)) {
                // Use fallback if provided, otherwise return the path
                if (fallback) {
                    return interpolate(fallback, params);
                }
                // DO NOT demote to debug. User mandate 2026-05-01: missing keys are real bugs and must page Sentry.
                logger.warn(`Translation missing for key: ${path} in language: ${language}`);
                // Dedicated, queryable PostHog signal so missing keys stay traceable
                // even when Sentry is dark (quota/outage). Deduped per key+language.
                trackTelemetryEvent('translation_missing', { key: path, language });
                return path;
            }
            current = (current as Record<string, unknown>)[key];
        }

        return typeof current === 'string' ? interpolate(current, params) : interpolate(fallback || path, params);
        // `translationsReady` is not read above — translations come from the ref.
        // It is here to change `t`'s IDENTITY when the dictionary lands. Without
        // it, any memoized subtree that painted during the async load window keeps
        // its stale `t` and renders raw key paths forever, because nothing ever
        // re-renders it. Components with a ticking prop healed themselves and hid
        // this for a long time; static ones (PracticeCoachTip, the swipe hint) did
        // not. Costs one extra render per consumer, once, when translations arrive.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [language, translationsReady]);

    // Memoize context value — depends on translationsReady (boolean) not currentTranslations (object).
    // This means consumers re-render at most once per language switch (false→true), not on every
    // intermediate state update of the large translations object.
    const value = useMemo<LanguageContextValue>(() => ({
        language,
        setLanguage,
        t,
        dir: (translationsRef.current?.direction as 'rtl' | 'ltr') || (language === 'he' ? 'rtl' : 'ltr'),
        currentFlag: (translationsRef.current?.flag as string) || FLAG_BY_LANGUAGE[language] || '🇺🇸'
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [language, setLanguage, t, translationsReady]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextValue => {
    const context = useContext(LanguageContext);
    if (!context) {
        // In development, throw to catch missing provider early
        if (process.env.NODE_ENV === 'development') {
            throw new Error('useLanguage must be used within a LanguageProvider');
        }
        // In production, gracefully fall back instead of crashing the page
        // Fixes JAVASCRIPT-NEXTJS-FQ: React 19 edge case where context is
        // briefly unavailable during dynamic import + Suspense on low-end devices
        return LANGUAGE_FALLBACK;
    }
    return context;
};

/**
 * Default translation function for use outside of LanguageContext
 * Falls back to English translations with basic key lookup
 */
const createFallbackT = (_lang: Language = 'en') => (
    path: string,
    fallbackOrParams?: string | Record<string, string | number>,
    _paramsWhenFallback?: Record<string, string | number>
): string => {
    // Fallback t() — translations may not be loaded yet, return key or fallback
    const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
    const params: Record<string, string | number> = typeof fallbackOrParams === 'object' && fallbackOrParams !== null
        ? fallbackOrParams
        : (_paramsWhenFallback || {});

    // Try to use cached translations if available
    const cached = getCachedTranslation(_lang);
    if (!cached) return interpolate(fallback || path, params);

    try {
        const keys = path.split('.');
        let current: unknown = cached;

        for (const key of keys) {
            if (typeof current !== 'object' || current === null || !(key in current)) {
                return interpolate(fallback || path, params);
            }
            current = (current as Record<string, unknown>)[key];
        }

        return typeof current === 'string' ? interpolate(current, params) : interpolate(fallback || path, params);
    } catch {
        return interpolate(fallback || path, params);
    }
};

/**
 * Fallback values used when LanguageProvider is not available
 * Useful for error boundaries and components that may render before provider mounts
 */
export const LANGUAGE_FALLBACK: LanguageContextValue = {
    language: 'en',
    setLanguage: () => {
        logger.warn('setLanguage called outside of LanguageProvider');
    },
    t: createFallbackT('en'),
    dir: 'ltr',
    currentFlag: '🇺🇸'
};

/**
 * Safe version of useLanguage that returns fallback values instead of throwing
 * when used outside of LanguageProvider. Useful for:
 * - Dynamically imported components that may load before provider mounts
 * - Components used in ErrorBoundary fallback UI
 * - Server-side rendering edge cases
 *
 * @returns LanguageContextValue - either from context or fallback defaults
 */
export const useLanguageSafe = (): LanguageContextValue => {
    const context = useContext(LanguageContext);
    if (!context) {
        // Log warning in development only to help identify missing providers
        if (process.env.NODE_ENV === 'development') {
            logger.warn('useLanguageSafe: LanguageProvider not found, using fallback values');
        }
        return LANGUAGE_FALLBACK;
    }
    return context;
};
