import type { Metadata } from 'next';
import Showcase3DClient from './Showcase3DClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

// Internal design preview — keep it out of the index until signed off.
export const metadata: Metadata = {
  title: '3D Hero — LexiClash',
  description: 'Tilt-reactive 3D hero landing prototype for LexiClash.',
  robots: { index: false, follow: false },
};

export default async function Showcase3DPage({ params }: PageProps) {
  const { locale } = await params;
  return <Showcase3DClient locale={locale} />;
}
