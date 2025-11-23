'use client';

import React, { createContext, useState, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children, initialLanguage }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [language, setLanguageState] = useState(initialLanguage || 'he');

    useEffect(() => {
        if (initialLanguage && initialLanguage !== language) {
            setLanguageState(initialLanguage);
        }
    }, [initialLanguage]);

    useEffect(() => {
        // Save to localStorage
        if (typeof window !== 'undefined') {
            localStorage.setItem('boggle_language', language);
        }
    }, [language]);

    const setLanguage = (newLang) => {
        if (newLang !== language) {
            setLanguageState(newLang);
            // Navigate to new locale
            router.push(`/${newLang}`);
        }
    };

    const t = (path) => {
        const keys = path.split('.');
        let current = translations[language];

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
