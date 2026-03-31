import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'brainPatternSwitcher', path: '/brain/drills/pattern-switcher', locale });
}

import PatternSwitcherPageClient from './PageClient';

export default function PatternSwitcherPage() {
  return <PatternSwitcherPageClient />;
}
