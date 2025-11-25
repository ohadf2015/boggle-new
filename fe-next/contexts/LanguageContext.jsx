'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations } from '../translations';
import { locales } from '../lib/i18n';

const LanguageContext = createContext();

const parseLocaleFromPath = (pathname) => {
    if (!pathname) return null;
    const segments = pathname.split('/');
    const locale = segments[1];
    return locales.includes(locale) ? locale : null;
};

export const LanguageProvider = ({ children, initialLanguage }) => {
    const router = useRouter();
    const pathname = usePathname();

    // Determine initial language
    const getInitialLanguage = () => {
        if (initialLanguage) return initialLanguage;
        if (typeof window !== 'undefined' && pathname) {
            const pathLocale = parseLocaleFromPath(pathname);
            if (pathLocale) return pathLocale;
        }
        return 'en';
    };

    const [language, setLanguageState] = useState(getInitialLanguage);

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

    const setLanguage = (newLang) => {
        if (newLang !== language) {
            setLanguageState(newLang);

            // Navigate to new locale preserving path
            const segments = pathname.split('/');
            // segments[0] is empty string
            const currentLocale = segments[1];

            if (locales.includes(currentLocale)) {
                segments[1] = newLang;
                router.push(segments.join('/'));
            } else {
                // Fallback if locale is missing (shouldn't happen with middleware)
                router.push(`/${newLang}${pathname}`);
            }
        }
    };

    const t = (path, params = {}) => {
        const keys = path.split('.');
        let current = translations[language] || translations['he']; // Fallback to Hebrew if language is invalid

        if (!current) {
            console.warn(`Translation missing for language: ${language}`);
            return path;
        }

        for (const key of keys) {
            if (current[key] === undefined) {
                console.warn(`Translation missing for key: ${path} in language: ${language}`);
                return path;
            }
            current = current[key];
        }

        // Replace template variables like ${varName} with params
        if (typeof current === 'string' && Object.keys(params).length > 0) {
            return current.replace(/\$\{(\w+)\}/g, (match, key) => {
                return params[key] !== undefined ? params[key] : match;
            });
        }

        return current;
    };

    const value = {
        language,
        setLanguage,
        t,
        dir: translations[language]?.direction || 'rtl',
        currentFlag: translations[language]?.flag || '🇮🇱'
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
