import type { Metadata } from 'next';
import { EducationLandingTemplate } from '@/components/education/EducationLandingTemplate';
import { buildEducationLandingMetadata } from '@/lib/seo/educationLanding';
import { getGamesForTeachersLanding } from './landing';

const PATH = '/education/games-for-teachers';

// Static marketing copy from a locale-keyed object — nothing per-request.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildEducationLandingMetadata({ locale, path: PATH, content: getGamesForTeachersLanding(locale) });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  return <EducationLandingTemplate locale={locale} path={PATH} content={getGamesForTeachersLanding(locale)} />;
}
