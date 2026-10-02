import { HELP_LOCALES } from './helpTypes';

export const HELP_BASE_URL = 'https://www.lexiclash.live';

export function helpUrl(locale: string, path: string): string {
  return `${HELP_BASE_URL}/${locale}${path}`;
}

export function helpAlternates(path: string): Record<string, string> {
  const alts: Record<string, string> = { 'x-default': helpUrl('en', path) };
  for (const l of HELP_LOCALES) alts[l] = helpUrl(l, path);
  return alts;
}
