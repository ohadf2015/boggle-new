import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { findTopicHub } from '@/lib/seo/wordLists/catalog';
import { TopicHubView, topicHubMetadata } from '../../_views/HubViews';

interface PageProps {
  params: Promise<{ locale: string; topic: string }>;
}

async function resolve(params: PageProps['params']) {
  const { locale, topic } = await params;
  const hub = findTopicHub(topic);
  if (!hub || !(hub.locales as string[]).includes(locale)) return null;
  return { hub, locale };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const r = await resolve(params);
  if (!r) notFound();
  return topicHubMetadata(r.hub, r.locale);
}

export default async function WordListTopicPage({ params }: PageProps) {
  const r = await resolve(params);
  if (!r) notFound();
  return <TopicHubView hub={r.hub} locale={r.locale} />;
}
