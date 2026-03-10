import type { Metadata } from 'next';
import { translations } from '@/translations';
import ToolsHubPageClient from './PageClient';
import { getContent, type Locale } from './word-solver/content';

type ValidLocale = keyof typeof translations;

interface PageParams {
  params: Promise<{ locale: string }>;
}

const BASE_URL = 'https://www.lexiclash.live';
const LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

export async function generateMetadata({ params }: PageParams): Promise<Metadata> {
  const { locale } = await params;
  const validLocale = (locale in translations ? locale : 'en') as ValidLocale;
  const content = getContent(validLocale);
  const localePath = `/${locale}`;
  const pageUrl = `${BASE_URL}${localePath}/tools`;

  const languages: Record<string, string> = { 'x-default': `${BASE_URL}/en/tools` };
  for (const loc of LOCALES) languages[loc] = `${BASE_URL}/${loc}/tools`;

  return {
    title: `${content.toolsHub.title} | LexiClash`,
    description: content.toolsHub.description,
    openGraph: {
      type: 'website',
      locale: validLocale,
      url: pageUrl,
      title: content.toolsHub.title,
      description: content.toolsHub.description,
      siteName: 'LexiClash',
    },
    alternates: {
      canonical: pageUrl,
      languages,
    },
  };
}

export default function ToolsHubPage() {
  return <ToolsHubPageClient />;
}
