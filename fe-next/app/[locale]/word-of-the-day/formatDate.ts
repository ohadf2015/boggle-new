import type { Locale } from './content';

const INTL_LOCALE: Record<Locale, string> = {
  en: 'en-US',
  he: 'he-IL',
  sv: 'sv-SE',
  ja: 'ja-JP',
  es: 'es-ES',
};

export function formatLongDate(locale: Locale, dateKey: string): string {
  const intlLocale = INTL_LOCALE[locale] ?? INTL_LOCALE.en;
  const date = new Date(dateKey + 'T00:00:00Z');
  if (Number.isNaN(date.getTime())) return dateKey;
  return new Intl.DateTimeFormat(intlLocale, {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
}
