import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'blast', path: '/blast', locale });
}

import BlastPageClient from './PageClient';

export default function BlastPage() {
  return <BlastPageClient />;
}
