/**
 * serverTranslate — resolve an i18n dotted key to a translated string OUTSIDE
 * React (no hooks, no LanguageContext). Used by server-side renderers such as
 * the welcome email, which run before any provider mounts.
 *
 * The translation modules are plain ESM objects (`export { en }`, …), so we can
 * import them directly and walk the dotted path. Resolution order:
 *   1. requested language → 2. English → 3. explicit fallback → 4. the key.
 * Never returns a non-string (a path that stops at a namespace object yields
 * the fallback, not the object).
 */
import { en } from '@/translations/en.js';
import { he } from '@/translations/he.js';
import { sv } from '@/translations/sv.js';
import { ja } from '@/translations/ja.js';
import { es } from '@/translations/es.js';

type Dict = Record<string, unknown>;

const DICTS: Record<string, Dict> = { en, he, sv, ja, es };

/** Walk a dotted path; return the string leaf, or undefined if missing/non-leaf. */
function walk(dict: Dict | undefined, key: string): string | undefined {
  if (!dict) return undefined;
  let node: unknown = dict;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Dict)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

export function translateKey(key: string, language: string, fallback?: string): string {
  return (
    walk(DICTS[language], key) ??
    walk(DICTS.en, key) ??
    fallback ??
    key
  );
}
