// Language context - adapted from fe-next/contexts/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';
import { translations } from '../lib/translations/translations';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from '../constants/game';

type TranslationValue = string | Record<string, any>;

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (path: string, params?: Record<string, string | number>) => string;
  isRTL: boolean;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = 'boggle_language';

// Get nested translation value by path
const getNestedValue = (obj: any, path: string): TranslationValue | undefined => {
  const keys = path.split('.');
  let current = obj;

  for (const key of keys) {
    if (current === undefined || current === null) return undefined;
    current = current[key];
  }

  return current;
};

interface LanguageProviderProps {
  children: React.ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('he');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved language on mount
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved && SUPPORTED_LANGUAGES.includes(saved as SupportedLanguage)) {
          setLanguageState(saved as SupportedLanguage);
        }
      } catch (error) {
        console.error('[Language] Failed to load saved language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, []);

  // Set language and persist
  const setLanguage = useCallback(async (newLang: SupportedLanguage) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, newLang);
      setLanguageState(newLang);

      // Handle RTL for Hebrew
      const isRTL = newLang === 'he';
      if (I18nManager.isRTL !== isRTL) {
        I18nManager.forceRTL(isRTL);
        // Note: App needs to restart for RTL changes to take full effect
      }
    } catch (error) {
      console.error('[Language] Failed to save language:', error);
    }
  }, []);

  // Translation function
  const t = useCallback(
    (path: string, params?: Record<string, string | number>): string => {
      const langTranslations = translations[language] || translations.he;
      let value = getNestedValue(langTranslations, path);

      // Fallback to Hebrew if not found
      if (value === undefined && language !== 'he') {
        value = getNestedValue(translations.he, path);
      }

      // If still not found, return the path
      if (value === undefined) {
        console.warn(`[Translation] Missing key: ${path} for language: ${language}`);
        return path;
      }

      // If it's not a string, return path (shouldn't happen for leaf values)
      if (typeof value !== 'string') {
        return path;
      }

      // Replace template variables ${varName}
      if (params) {
        return value.replace(/\$\{(\w+)\}/g, (match, key) => {
          return params[key] !== undefined ? String(params[key]) : match;
        });
      }

      return value;
    },
    [language]
  );

  const isRTL = language === 'he';

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isRTL,
        availableLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {!isLoading && children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
