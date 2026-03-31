import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import SettingsPageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'settings', path: '/settings', locale, noIndex: true });
}

export default function SettingsPage() {
  return <SettingsPageClient />;
}
