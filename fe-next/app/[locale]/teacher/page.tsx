import type { Metadata } from 'next';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { PublicTeacherPayCta } from './PublicTeacherPayCta';
import TeacherPageClient from './PageClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  // Auth dashboard — keep noindex. Public teacher GEO lives on
  // /education/games-for-teachers (FAQPage + Course JSON-LD + visible H2/H3 answers).
  return generatePageMetadata({ seoKey: 'education', path: '/teacher', locale, noIndex: true });
}

export const dynamic = 'force-dynamic';

export default async function TeacherPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <>
      <PublicTeacherPayCta locale={locale} />
      <TeacherPageClient />
    </>
  );
}
