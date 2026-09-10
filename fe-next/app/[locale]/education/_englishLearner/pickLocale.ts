import type { EducationLocale, LocaleContent } from './types';

export function pickLocaleContent(
  locale: string,
  content: Record<EducationLocale, LocaleContent>,
): LocaleContent {
  const normalized = locale.toLowerCase().split('-')[0] as EducationLocale;
  return content[normalized] ?? content.en;
}
