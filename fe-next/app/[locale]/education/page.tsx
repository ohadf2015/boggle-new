import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import EducationPageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationHub', path: '/education', locale });
}

export default function EducationPage() {
  return <EducationPageClient />;
}
