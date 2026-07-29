import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'wordForge', path: '/word-forge', locale });
}

import WordForgePageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default function WordForgePage() {
  return <WordForgePageClient />;
}
