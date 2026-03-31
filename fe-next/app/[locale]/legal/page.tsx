import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'legal', path: '/legal', locale });
}

import LegalIndexPageClient from './PageClient';

export default function LegalIndexPage() {
  return <LegalIndexPageClient />;
}
