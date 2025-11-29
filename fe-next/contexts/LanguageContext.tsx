'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
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

    // Determine initial language
    const getInitialLanguage = (): Language => {
        if (initialLanguage) return initialLanguage;

        if (typeof window !== 'undefined') {
            // Check path locale first
            if (pathname) {
                const pathLocale = parseLocaleFromPath(pathname);
                if (pathLocale) return pathLocale;
            }

            // Check localStorage for user's explicit preference
            const savedLanguage = localStorage.getItem('boggle_language');
            if (savedLanguage && locales.includes(savedLanguage as Language)) {
                return savedLanguage as Language;
            }

            // Check for location-detected locale from middleware
            const detectedLocale = getCookieLocale('boggle_detected_locale');
            if (detectedLocale) return detectedLocale;

            // Use browser language as fallback
            const browserLang = getBrowserLanguage();
            if (browserLang) return browserLang;
        }

        return defaultLocale;
    };

    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    // Sync language when pathname or initialLanguage changes
    useEffect(() => {
        const newLang = initialLanguage || (pathname ? parseLocaleFromPath(pathname) : null) || 'en';
        if (newLang !== language) {
            // Use queueMicrotask to avoid setState during render warning
            queueMicrotask(() => setLanguageState(newLang));
        }
    }, [initialLanguage, pathname, language]);

    useEffect(() => {
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('boggle_language', language);
        }
    }, [language]);

    const setLanguage = (newLang: Language) => {
        if (newLang !== language) {
            setLanguageState(newLang);

            // Navigate to new locale preserving path
            const segments = pathname.split('/');
            // segments[0] is empty string
            const currentLocale = segments[1];

            if (locales.includes(currentLocale as Language)) {
                segments[1] = newLang;
                router.push(segments.join('/'));
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

        // Replace template variables like ${varName} with params
        if (typeof current === 'string' && Object.keys(params).length > 0) {
            return current.replace(/\$\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? String(params[key]) : match;
            });
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
