import type { Metadata } from 'next';
import { EducationKitLanding } from '@/components/landing/education/EducationKitLanding';
import { buildEducationLandingMetadata } from '@/lib/seo/educationLanding';
import { getEnglishGamesAdultsLanding } from './landing';

const PATH = '/education/english-games-adults';

export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildEducationLandingMetadata({ locale, path: PATH, content: getEnglishGamesAdultsLanding(locale) });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  return <EducationKitLanding locale={locale} path={PATH} content={getEnglishGamesAdultsLanding(locale)} />;
}
