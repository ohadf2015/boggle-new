import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findGradeHub, findList } from '@/lib/seo/wordLists/catalog';
import { ListView, listMetadata } from '../../_views/ListView';
import { GradeHubView, gradeHubMetadata } from '../../_views/HubViews';

interface PageProps {
  params: Promise<{ locale: string; lang: string; item: string }>;
}

/** `grade-N` is a grade hub; anything else is a list slug. */
async function resolve(params: PageProps['params']) {
  const { locale, lang, item } = await params;
  const hub = findGradeHub(lang, item);
  if (hub) return (hub.locales as string[]).includes(locale) ? ({ kind: 'grade', hub, locale } as const) : null;
  const list = findList(lang, item);
  if (list && (list.locales as string[]).includes(locale)) return { kind: 'list', list, locale } as const;
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) notFound();
  return r.kind === 'grade' ? gradeHubMetadata(r.hub, r.locale) : listMetadata(r.list, r.locale);
}

export default async function WordListItemPage({ params }: PageProps) {
  const r = await resolve(params);
  if (!r) notFound();
  return r.kind === 'grade' ? <GradeHubView hub={r.hub} locale={r.locale} /> : <ListView list={r.list} locale={r.locale} />;
}
