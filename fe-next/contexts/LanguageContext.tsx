'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations } from '../translations';
import { locales, defaultLocale } from '../lib/i18n';
import logger from '@/utils/logger';
import type { Language } from '@/types';

interface LanguageContextValue {
  language: Language;
  setLanguage: (newLang: Language) => void;
  t: (path: string, params?: Record<string, string | number>) => string;
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
        const primaryLang = lang.split('-')[0].toLowerCase();

        // Check if we support this language
        if (locales.includes(primaryLang as Language)) {
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

    // After mount, check for client-side preferences
    useEffect(() => {
        mountedRef.current = true;
        const currentLang = languageRef.current;

        // Check localStorage for user's explicit preference
        const savedLanguage = localStorage.getItem('boggle_language');
        if (savedLanguage && locales.includes(savedLanguage as Language)) {
            if (savedLanguage !== currentLang) {
                setLanguageState(savedLanguage as Language);
            }
            return;
        }

        // Check for location-detected locale from middleware
        const detectedLocale = getCookieLocale('boggle_detected_locale');
        if (detectedLocale && detectedLocale !== currentLang) {
            setLanguageState(detectedLocale);
            return;
        }

        // Use browser language as fallback
        const browserLang = getBrowserLanguage();
        if (browserLang && browserLang !== currentLang) {
            setLanguageState(browserLang);
        }
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

    const setLanguage = (newLang: Language) => {
        if (newLang !== language) {
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
    };

    const t = (path: string, params: Record<string, string | number> = {}): string => {
        const keys = path.split('.');
        let current: unknown = translations[language] || translations['he']; // Fallback to Hebrew if language is invalid

        if (!current) {
            logger.warn(`Translation missing for language: ${language}`);
            return path;
        }

        for (const key of keys) {
            if (typeof current !== 'object' || current === null || !(key in current)) {
                logger.warn(`Translation missing for key: ${path} in language: ${language}`);
                return path;
            }
            current = (current as Record<string, unknown>)[key];
        }

        // Replace template variables like ${varName} or {varName} with params
        if (typeof current === 'string' && Object.keys(params).length > 0) {
            // First handle ${varName} format
            let result = current.replace(/\$\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            // Then handle {varName} format (for translations with curly braces only)
            result = result.replace(/\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
            return result;
        }

        return typeof current === 'string' ? current : path;
    };

    const value: LanguageContextValue = {
        language,
        setLanguage,
        t,
        dir: (translations[language] as { direction?: 'rtl' | 'ltr' })?.direction || 'rtl',
        currentFlag: (translations[language] as { flag?: string })?.flag || '🇮🇱'
    };

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
