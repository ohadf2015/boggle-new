import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import ComboMasterPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainComboMaster', path: '/brain/drills/combo-master', locale, noIndex: true });
}

export default async function ComboMasterPage() {
  return <ComboMasterPageClient />;
}
