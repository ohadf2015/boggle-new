import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainComboMaster', path: '/brain/drills/combo-master', locale });
}

import ComboMasterPageClient from './PageClient';

export default function ComboMasterPage() {
  return <ComboMasterPageClient />;
}
