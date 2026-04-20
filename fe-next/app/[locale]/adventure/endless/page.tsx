/**
 * Endless Mode Page
 *
 * Procedurally generated floors with escalating difficulty.
 * Unlocked after completing all 10 worlds.
 */

import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import EndlessPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'adventureEndless', path: '/adventure/endless', locale });
}

export default function EndlessPage() {
  return <EndlessPageClient />;
}
