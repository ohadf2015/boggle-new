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
