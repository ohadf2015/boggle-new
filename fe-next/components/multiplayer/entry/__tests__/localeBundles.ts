/**
 * Test helper: resolve translation keys through the IMPORTED locale bundles
 * (never grep — sv.js has a duplicate top-level key, and the object literal's
 * last definition is the one the app actually ships).
 */
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';
import { ru } from '@/translations/ru.js';

export const BUNDLES = { en, he, sv, ja, es, ru } as Record<string, Record<string, unknown>>;
export const LOCALES = Object.keys(BUNDLES);

export function resolveKey(bundle: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), bundle);
}

/** A minimal `t` over one bundle: `{{var}}` / `{var}` interpolation, key echo when missing. */
export function bundleT(locale: string) {
  return (key: string, params?: Record<string, string | number>): string => {
    const raw = resolveKey(BUNDLES[locale], key);
    if (typeof raw !== 'string') return key;
    return raw.replace(/\{\{?(\w+)\}?\}/g, (m, name: string) => (params && name in params ? String(params[name]) : m));
  };
}
