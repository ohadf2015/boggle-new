import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState(() => {
        const saved = localStorage.getItem('boggle_language');
        if (saved && translations[saved]) return saved;

        const browserLang = navigator.language.split('-')[0];
        return translations[browserLang] ? browserLang : 'en';
    });

    useEffect(() => {
        localStorage.setItem('boggle_language', language);

        // Update SEO meta tags when language changes
        if (window.updateSEOMetaTags) {
            window.updateSEOMetaTags(language);
        }
    }, [language]);

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
        dir: translations[language].direction,
        currentFlag: translations[language].flag
    };

    return (
        <LanguageContext.Provider value={value}>
            <div dir={value.dir} className="min-h-screen transition-all duration-300">
                {children}
            </div>
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
