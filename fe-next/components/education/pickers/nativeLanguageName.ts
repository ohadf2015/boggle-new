import { LANGUAGE_CONFIG } from '@/lib/languageConfig';
import type { Language } from '@/types';

/** Endonym ("עברית", "日本語"); the code itself for anything unmapped. */
export function nativeLanguageName(code: string): string {
  return LANGUAGE_CONFIG[code as Language]?.nativeName ?? code;
}
