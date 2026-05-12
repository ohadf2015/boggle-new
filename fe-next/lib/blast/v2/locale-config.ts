import type { Locale, ThemeKey } from './types';
import { EN_CONFIG } from './locales/en';

export type ThemeDef = {
  key: ThemeKey;
  displayKey: string;
  wordPool: string[];
};

export type LocaleConfig = {
  locale: Locale;
  rtl: boolean;
  normalize: (s: string) => string;
  displayChar: (c: string, posInWord: number, wordLen: number) => string;
  letterFrequency: Record<string, number>;
  tilePool: string[];
  wordLengthRange: { min: number; max: number };
  themes: Record<ThemeKey, ThemeDef>;
  bonusDictionary: () => Promise<Set<string>>;
  fontStack: string;
  tileExtraPadding?: number;
};

export const LOCALE_CONFIGS: Record<Locale, LocaleConfig> = {
  en: EN_CONFIG,
} as Record<Locale, LocaleConfig>;
