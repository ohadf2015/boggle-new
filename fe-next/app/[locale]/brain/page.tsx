import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brain', path: '/brain', locale });
}

import BrainTrainingPageClient from './PageClient';

export default function BrainTrainingPage() {
  return <BrainTrainingPageClient />;
}
