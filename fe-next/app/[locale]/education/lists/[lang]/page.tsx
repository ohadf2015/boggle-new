import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findLangHub } from '@/lib/seo/wordLists/catalog';
import { LangHubView, langHubMetadata } from '../_views/HubViews';

interface PageProps {
  params: Promise<{ locale: string; lang: string }>;
}

async function resolve(params: PageProps['params']) {
  const { locale, lang } = await params;
  const hub = findLangHub(lang);
  if (!hub || !(hub.locales as string[]).includes(locale)) return null;
  return { hub, locale };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) notFound();
  return langHubMetadata(r.hub, r.locale);
}

export default async function WordListLanguagePage({ params }: PageProps) {
  const r = await resolve(params);
  if (!r) notFound();
  return <LangHubView hub={r.hub} locale={r.locale} />;
}
