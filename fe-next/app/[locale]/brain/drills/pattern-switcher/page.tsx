import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import PatternSwitcherPageClient from './PageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainPatternSwitcher', path: '/brain/drills/pattern-switcher', locale, noIndex: true });
}

export default async function PatternSwitcherPage() {
  return <PatternSwitcherPageClient />;
}
