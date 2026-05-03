import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PracticePageClient from './PageClient';
import { isValidPracticeMode, PRACTICE_MODES } from '@/lib/practice/practiceRoute';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { PracticeModeJsonLd } from '@/components/seo/PracticeJsonLd';
import BreadcrumbJsonLd from '@/components/seo/BreadcrumbJsonLd';

const LOCALES = ['en', 'he', 'sv', 'ja', 'es'] as const;
const SITE_URL = 'https://www.lexiclash.live';

const MODE_BREADCRUMB_NAME: Record<(typeof PRACTICE_MODES)[number], string> = {
  classic: 'Classic Practice',
  wordHunt: 'Word Hunt Practice',
  wheelRush: 'Word Wheel Practice',
};

interface Props {
  params: Promise<{ locale: string; mode: string }>;
}

export async function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    PRACTICE_MODES.map((mode) => ({ locale, mode }))
  );
}

const SEO_KEY_BY_MODE: Record<(typeof PRACTICE_MODES)[number], string> = {
  classic: 'practiceClassic',
  wordHunt: 'practiceWordHunt',
  wheelRush: 'practiceWheelRush',
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, mode } = await params;
  if (!isValidPracticeMode(mode)) {
    return generatePageMetadata({ seoKey: 'practice', path: '/practice', locale });
  }
  return generatePageMetadata({
    seoKey: SEO_KEY_BY_MODE[mode],
    path: `/practice/${mode}`,
    locale,
  });
}

export default async function PracticeModePage({ params }: Props) {
  const { locale, mode } = await params;
  if (!isValidPracticeMode(mode)) notFound();
  return (
    <>
      <PracticeModeJsonLd mode={mode} locale={locale} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${SITE_URL}/${locale}` },
          { name: 'Practice', url: `${SITE_URL}/${locale}/practice` },
          { name: MODE_BREADCRUMB_NAME[mode], url: `${SITE_URL}/${locale}/practice/${mode}` },
        ]}
      />
      <PracticePageClient mode={mode} locale={locale} />
    </>
  );
}
