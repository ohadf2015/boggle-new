import { en } from "@/translations/en.js";
import { he } from "@/translations/he.js";

const lang = new URLSearchParams(location.search).get('lang') === 'he' ? 'he' : 'en';
const tree = (lang === 'he' ? he : en) as Record<string, unknown>;

function t(key: string, vars?: Record<string, string | number> | string) {
  const v = key.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], tree);
  const s = typeof v === 'string' ? v : typeof vars === 'string' ? vars : key;
  return typeof vars === 'object' ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : s;
}

export const useLanguage = () => ({ t, language: lang, dir: lang === 'he' ? 'rtl' : 'ltr' });
