import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import QuickPlayPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // BETA-gated (PageClient redirects non-beta users) — keep noindexed until GA
  // so reviewers/search never land on a redirect wall.
  return generatePageMetadata({ seoKey: 'quickPlay', path: '/quick-play', locale, noIndex: true });
}

export default function QuickPlayPage() {
  return <QuickPlayPageClient />;
}
