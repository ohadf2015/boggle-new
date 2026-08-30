import type { Metadata } from 'next';
import { EducationLandingTemplate } from '@/components/education/EducationLandingTemplate';
import { buildEducationLandingMetadata } from '@/lib/seo/educationLanding';
import { getEndOfYearContent } from './content';

const PATH = '/education/end-of-year-classroom-activities';

// Static marketing copy from a locale-keyed object — nothing per-request.
export const revalidate = 86400;

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return buildEducationLandingMetadata({ locale, path: PATH, content: getEndOfYearContent(locale) });
}

export default async function Page({ params }: PageProps) {
  const { locale } = await params;
  return <EducationLandingTemplate locale={locale} path={PATH} content={getEndOfYearContent(locale)} />;
}
