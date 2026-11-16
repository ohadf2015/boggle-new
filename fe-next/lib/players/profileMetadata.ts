import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { loadTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';

const FALLBACK_TITLE = '{name} on LexiClash';

async function titleTemplate(locale: string): Promise<string> {
  try {
    const t = (await loadTranslation(locale as Language)) as { brag2?: { profile?: { metaTitle?: unknown } } };
    const tpl = t?.brag2?.profile?.metaTitle;
    return typeof tpl === 'string' && tpl.includes('{name}') ? tpl : FALLBACK_TITLE;
  } catch {
    return FALLBACK_TITLE;
  }
}

/** Profile page metadata; names the player in the title only when `name` is already vetted public. */
export async function buildPlayerProfileMetadata({ locale, path, name }: { locale: string; path: string; name: string | null }): Promise<Metadata> {
  const base = await generatePageMetadata({ seoKey: 'playerProfile', path, locale });
  if (!name) return base;
  const title = (await titleTemplate(locale)).replace('{name}', name);
  return {
    ...base,
    title: { absolute: title },
    openGraph: { ...base.openGraph, title },
    twitter: { ...base.twitter, title },
  };
}
