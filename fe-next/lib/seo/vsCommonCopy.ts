/**
 * Strings shared by every `lexiclash-vs-*` comparison page, in all six locales.
 * A page's own `copy.ts` spreads `vsCommonCopy[locale]` and adds its page text.
 */
import { defaultLocale, locales, type Locale } from '@/i18n/config';

export interface VsCommonCopy {
  ctaTry: string;
  ctaTeachers: string;
  ctaEsl: string;
  tableHeading: string;
  thFeature: string;
  faqTitle: string;
  moreTitle: string;
  breadcrumbHome: string;
  breadcrumbComparisons: string;
}

export const vsCommonCopy: Record<Locale, VsCommonCopy> = {
  en: {
    ctaTry: 'Try LexiClash Free',
    ctaTeachers: 'For Teachers',
    ctaEsl: 'ESL Word Games',
    tableHeading: 'Side-by-side, no spin',
    thFeature: 'Feature',
    faqTitle: 'Frequently asked questions',
    moreTitle: 'More comparisons',
    breadcrumbHome: 'Home',
    breadcrumbComparisons: 'Comparisons',
  },
  he: {
    ctaTry: 'נסו את LexiClash בחינם',
    ctaTeachers: 'למורים',
    ctaEsl: 'משחקי מילים ללימוד אנגלית',
    tableHeading: 'זה מול זה, בלי קישוטים',
    thFeature: 'תכונה',
    faqTitle: 'שאלות נפוצות',
    moreTitle: 'עוד השוואות',
    breadcrumbHome: 'דף הבית',
    breadcrumbComparisons: 'השוואות',
  },
  es: {
    ctaTry: 'Prueba LexiClash gratis',
    ctaTeachers: 'Para docentes',
    ctaEsl: 'Juegos de palabras para ESL',
    tableHeading: 'Cara a cara, sin rodeos',
    thFeature: 'Característica',
    faqTitle: 'Preguntas frecuentes',
    moreTitle: 'Más comparativas',
    breadcrumbHome: 'Inicio',
    breadcrumbComparisons: 'Comparativas',
  },
  sv: {
    ctaTry: 'Prova LexiClash gratis',
    ctaTeachers: 'För lärare',
    ctaEsl: 'Ordspel för engelskundervisning',
    tableHeading: 'Sida vid sida, utan omsvep',
    thFeature: 'Funktion',
    faqTitle: 'Vanliga frågor',
    moreTitle: 'Fler jämförelser',
    breadcrumbHome: 'Hem',
    breadcrumbComparisons: 'Jämförelser',
  },
  ja: {
    ctaTry: 'LexiClashを無料で試す',
    ctaTeachers: '先生向け',
    ctaEsl: '英語学習の単語ゲーム',
    tableHeading: '並べて比べてみました',
    thFeature: '項目',
    faqTitle: 'よくある質問',
    moreTitle: 'ほかの比較',
    breadcrumbHome: 'ホーム',
    breadcrumbComparisons: '比較',
  },
  ru: {
    ctaTry: 'Попробовать LexiClash бесплатно',
    ctaTeachers: 'Для учителей',
    ctaEsl: 'Словесные игры для изучения английского',
    tableHeading: 'Сравнение без прикрас',
    thFeature: 'Возможность',
    faqTitle: 'Частые вопросы',
    moreTitle: 'Другие сравнения',
    breadcrumbHome: 'Главная',
    breadcrumbComparisons: 'Сравнения',
  },
};

/** Unknown locales read as English, the page's source language. */
export function resolveVsLocale(locale: string): Locale {
  return (locales as readonly string[]).includes(locale) ? (locale as Locale) : defaultLocale;
}
