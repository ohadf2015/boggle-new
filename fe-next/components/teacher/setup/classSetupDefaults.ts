// Smart defaults for the 2-step class setup: grade band → name, UI language → class language.

import { EDUCATION_LANGUAGES, type Language } from '@/lib/supabase/education/types';
import { uniqueClassroomName } from '../classroom/uniqueClassName';

export const GRADE_BANDS = ['k2', 'g35', 'g68', 'g912', 'adult'] as const;
export type GradeBand = (typeof GRADE_BANDS)[number];

export function defaultClassLanguage(uiLanguage: string): Language {
  return (EDUCATION_LANGUAGES as readonly string[]).includes(uiLanguage) ? (uiLanguage as Language) : 'en';
}

export function resolveClassName(
  typed: string,
  band: GradeBand | null,
  t: (key: string, params?: Record<string, string | number>) => string,
  existingNames: readonly string[],
): string {
  const base =
    typed.trim() ||
    (band ? t(`eduShell.setup.gradeName.${band}`) : t('eduShell.setup.defaultName', { n: existingNames.length + 1 }));
  return uniqueClassroomName(base, [...existingNames]);
}

export function classCap({ count, hasPro, limit }: { count: number; hasPro: boolean; limit: number }) {
  if (hasPro) return null;
  return { count, limit, atLimit: count >= limit };
}
