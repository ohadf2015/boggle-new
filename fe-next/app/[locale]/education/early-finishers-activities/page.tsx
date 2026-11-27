import type { Metadata } from 'next';
import { EducationKitLanding } from '@/components/landing/education/EducationKitLanding';
import { buildEducationLandingMetadata } from '@/lib/seo/educationLanding';
import { getEarlyFinishersContent } from './content';

const PATH = '/education/early-finishers-activities';

// Static marketing copy from a locale-keyed object — nothing per-request.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildEducationLandingMetadata({ locale, path: PATH, content: getEarlyFinishersContent(locale) });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  return <EducationKitLanding locale={locale} path={PATH} content={getEarlyFinishersContent(locale)} />;
}
