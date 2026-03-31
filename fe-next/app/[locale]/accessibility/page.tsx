import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import AccessibilitySettingsPageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'accessibility', path: '/accessibility', locale });
}

export default function AccessibilitySettingsPage() {
  return <AccessibilitySettingsPageClient />;
}
