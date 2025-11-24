'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations } from '../translations';
import { locales } from '../lib/i18n';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialLanguage }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [language, setLanguageState] = useState(initialLanguage || 'he');

    useEffect(() => {
        if (initialLanguage && initialLanguage !== language) {
            // Defer state update to avoid synchronous setState
            Promise.resolve().then(() => {
                setLanguageState(initialLanguage);
            });
        }
    }, [initialLanguage, language]);

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

    const t = (path) => {
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
