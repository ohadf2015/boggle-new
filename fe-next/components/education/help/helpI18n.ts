import { translateKey } from '@/lib/i18n/serverTranslate';
import { fillHelpVars } from './helpText';

export type HelpT = (key: string, vars?: Record<string, string | number>) => string;

/** Server-side `t()`; these pages render without the client i18n provider. */
export function helpT(locale: string): HelpT {
  return (key, vars) => {
    const value = translateKey(key, locale);
    return vars ? fillHelpVars(value, vars) : value;
  };
}

export function helpDate(locale: string, iso: string): string {
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}
