'use client';

import { createContext, useState, useContext, useEffect, useRef, useCallback, useMemo, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations } from '../translations';
import { locales, defaultLocale } from '../lib/i18n';
import logger from '@/utils/logger';
import type { Language } from '@/types';

interface LanguageContextValue {
  language: Language;
  setLanguage: (newLang: Language) => void;
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

const parseLocaleFromPath = (pathname: string): Language | null => {
    if (!pathname) return null;
    const segments = pathname.split('/');
    const locale = segments[1];
    return locales.includes(locale as Language) ? (locale as Language) : null;
};

// Map browser language codes to supported locales
const getBrowserLanguage = (): Language | null => {
    if (typeof window === 'undefined' || !navigator) return null;

    // Get browser languages (e.g., ['en-US', 'en', 'he'])
    const browserLanguages = navigator.languages || [navigator.language];

    for (const lang of browserLanguages) {
        // Get the primary language code (e.g., 'en' from 'en-US')
        const primaryLang = lang.split('-')[0]?.toLowerCase();

        // Check if we support this language
        if (primaryLang && locales.includes(primaryLang as Language)) {
            return primaryLang as Language;
        }
    }

    return null;
};

interface LanguageProviderProps {
  children: ReactNode;
  initialLanguage?: Language;
}

export const LanguageProvider = ({ children, initialLanguage }: LanguageProviderProps) => {
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

    // Keep ref in sync
    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    // After mount, sync localStorage with URL locale
    // URL is the source of truth - don't override explicit URL locale with stored preferences
    useEffect(() => {
        mountedRef.current = true;

        // Get the locale from the URL path
        const urlLocale = pathname ? parseLocaleFromPath(pathname) : null;

        // If URL has an explicit locale, that's the source of truth
        // Don't change language state - the URL dictates the language
        if (urlLocale) {
            return;
        }

        // Only if there's NO locale in URL (shouldn't happen with middleware, but fallback)
        // do we check stored preferences
        const currentLang = languageRef.current;

        // Check localStorage for user's explicit preference
        const savedLanguage = localStorage.getItem('boggle_language');
        if (savedLanguage && locales.includes(savedLanguage as Language)) {
            if (savedLanguage !== currentLang) {
                setLanguageState(savedLanguage as Language);
            }
            return;
        }

        // Use browser language as fallback
        // Location-based detection removed to respect user preferences
        const browserLang = getBrowserLanguage();
        if (browserLang && browserLang !== currentLang) {
            setLanguageState(browserLang);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only run on mount - pathname is read once for initialization

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

    const setLanguage = useCallback((newLang: Language) => {
        if (newLang !== languageRef.current) {
            setLanguageState(newLang);

            // Also update cookie immediately for server-side consistency
            if (typeof document !== 'undefined') {
                document.cookie = `boggle_language=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
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
        // Use type assertion since Language type may include values not in translations
        let current: unknown = (translations as Record<string, unknown>)[language] || translations['he']; // Fallback to Hebrew if language is invalid

        if (!current) {
            logger.warn(`Translation missing for language: ${language}`);
            return fallback || path;
        }

        for (const key of keys) {
            if (typeof current !== 'object' || current === null || !(key in current)) {
                // Use fallback if provided, otherwise return the path
                if (fallback) {
                    return fallback;
                }
                logger.warn(`Translation missing for key: ${path} in language: ${language}`);
                return path;
            }
            current = (current as Record<string, unknown>)[key];
        }

        // Replace template variables like ${varName}, {{varName}}, or {varName} with params
        if (typeof current === 'string' && Object.keys(params).length > 0) {
            // First handle ${varName} format
            let result = current.replace(/\$\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            // Then handle {{varName}} format (i18next-style double braces)
            result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            // Finally handle {varName} format (single braces)
            result = result.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            return result;
        }

        return typeof current === 'string' ? current : (fallback || path);
    }, [language]);

    // Memoize context value to prevent unnecessary re-renders of all consumers
    const value = useMemo<LanguageContextValue>(() => ({
        language,
        setLanguage,
        t,
        dir: ((translations as Record<string, { direction?: 'rtl' | 'ltr' }>)[language])?.direction || 'rtl',
        currentFlag: ((translations as Record<string, { flag?: string }>)[language])?.flag || '🇮🇱'
    }), [language, setLanguage, t]);

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextValue => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

/**
 * Default translation function for use outside of LanguageContext
 * Falls back to English translations with basic key lookup
 */
const createFallbackT = (lang: Language = 'en') => (
    path: string,
    fallbackOrParams?: string | Record<string, string | number>,
    paramsWhenFallback?: Record<string, string | number>
): string => {
    const fallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
    const params: Record<string, string | number> = typeof fallbackOrParams === 'object' && fallbackOrParams !== null
        ? fallbackOrParams
        : (paramsWhenFallback || {});

    try {
        const keys = path.split('.');
        let current: unknown = (translations as Record<string, unknown>)[lang] || translations['en'];

        for (const key of keys) {
            if (typeof current !== 'object' || current === null || !(key in current)) {
                return fallback || path;
            }
            current = (current as Record<string, unknown>)[key];
        }

        if (typeof current === 'string' && Object.keys(params).length > 0) {
            let result = current.replace(/\$\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            result = result.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            return result;
        }

        return typeof current === 'string' ? current : (fallback || path);
    } catch {
        return fallback || path;
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
