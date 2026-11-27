import type { Metadata } from 'next';
import HolidayLanding from '@/components/holidays/landing/HolidayLanding';
import { landingBySlug, landingMetadata } from '@/lib/holidays/landing';

export const revalidate = 3600;

const PAGE = landingBySlug('novogodnie-igry');

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  return landingMetadata(PAGE, locale);
}

export default function Page() {
  return <HolidayLanding page={PAGE} now={new Date()} />;
}
