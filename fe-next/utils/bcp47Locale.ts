/**
 * Maps internal language codes to BCP 47 locale tags.
 * Required because Node.js small-icu doesn't recognize bare codes like 'sv'.
 */
const BCP47_MAP: Record<string, string> = {
  en: 'en-US',
  he: 'he-IL',
  sv: 'sv-SE',
  ja: 'ja-JP',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
};

export function toBcp47Locale(language: string): string {
  return BCP47_MAP[language] ?? 'en-US';
}

export function safeToLocaleDateString(date: Date, language: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    return date.toLocaleDateString(toBcp47Locale(language), options);
  } catch {
    return date.toLocaleDateString('en-US', options);
  }
}

export function safeToLocaleString(value: number, language: string, options?: Intl.NumberFormatOptions): string {
  try {
    return value.toLocaleString(toBcp47Locale(language), options);
  } catch {
    return value.toLocaleString('en-US', options);
  }
}

export function safeLocaleCompare(a: string, b: string, language: string): number {
  try {
    return a.localeCompare(b, toBcp47Locale(language));
  } catch {
    return a.localeCompare(b, 'en-US');
  }
}
