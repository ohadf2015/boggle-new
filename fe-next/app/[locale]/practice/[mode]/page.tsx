import { notFound } from 'next/navigation';
import PracticePageClient from './PageClient';
import { isValidPracticeMode, PRACTICE_MODES } from '@/lib/practice/practiceRoute';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ locale: string; mode: string }>;
}

export async function generateStaticParams() {
  return PRACTICE_MODES.map((mode) => ({ mode }));
}

export default async function PracticeModePage({ params }: Props) {
  const { locale, mode } = await params;
  if (!isValidPracticeMode(mode)) notFound();
  return <PracticePageClient mode={mode} locale={locale} />;
}
