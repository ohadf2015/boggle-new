import type { Metadata } from 'next';
import GuidesIndexPageClient from './PageClient';

interface PageProps {
  params: Promise<{ locale: string }>;
}

const SITE_URL = 'https://www.lexiclash.live';

const metaTitles: Record<string, string> = {
  en: 'Strategy Guides - Master Every Game Mode | LexiClash',
  he: 'מדריכי אסטרטגיה - שלטו בכל מצב משחק | לקסיקלאש',
  sv: 'Strategiguider - Bemestra Varje Spelmod | LexiClash',
  ja: '攻略ガイド - すべてのゲームモードをマスター | LexiClash',
  es: 'Guias de Estrategia - Domina Cada Modo de Juego | LexiClash',
};

const metaDescriptions: Record<string, string> = {
  en: 'Expert strategy guides for LexiClash Classic, Blast, and Word Hunt modes. Tips, techniques, and scoring strategies from top players.',
  he: 'מדריכי אסטרטגיה מומחים למצבי קלאסי, בלאסט וציד מילים של לקסיקלאש.',
  sv: 'Expertstrategiguider for LexiClash Klassiskt, Blast och Word Hunt-lage.',
  ja: 'LexiClashクラシック、ブラスト、ワードハントモードのエキスパート攻略ガイド。',
  es: 'Guias de estrategia experta para los modos Clasico, Blast y Word Hunt de LexiClash.',
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const title = metaTitles[locale] || metaTitles.en;
  const description = metaDescriptions[locale] || metaDescriptions.en;

  return {
    title, description,
    openGraph: { type: 'website', title, description, url: `${SITE_URL}/${locale}/guides`, siteName: 'LexiClash' },
    twitter: { card: 'summary_large_image', title, description },
    alternates: {
      canonical: `${SITE_URL}/${locale}/guides`,
      languages: {
        'x-default': `${SITE_URL}/en/guides`, he: `${SITE_URL}/he/guides`,
        en: `${SITE_URL}/en/guides`, sv: `${SITE_URL}/sv/guides`,
        ja: `${SITE_URL}/ja/guides`, es: `${SITE_URL}/es/guides`,
        'en-IL': `${SITE_URL}/en/guides`, 'he-IL': `${SITE_URL}/he/guides`,
        'en-US': `${SITE_URL}/en/guides`, 'es-US': `${SITE_URL}/es/guides`,
        'en-GB': `${SITE_URL}/en/guides`, 'en-SE': `${SITE_URL}/en/guides`,
        'sv-SE': `${SITE_URL}/sv/guides`, 'en-JP': `${SITE_URL}/en/guides`,
        'ja-JP': `${SITE_URL}/ja/guides`, 'en-ES': `${SITE_URL}/en/guides`,
        'es-ES': `${SITE_URL}/es/guides`, 'en-MX': `${SITE_URL}/en/guides`,
        'es-MX': `${SITE_URL}/es/guides`, 'en-AU': `${SITE_URL}/en/guides`,
        'es-AR': `${SITE_URL}/es/guides`, 'es-CO': `${SITE_URL}/es/guides`,
      },
    },
    robots: { index: true, follow: true },
  };
}

export default async function GuidesIndexPage({ params }: PageProps) {
  const { locale } = await params;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/${locale}` },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/${locale}/guides` },
    ],
  };

  // Safe: breadcrumb content sourced from static URL constants, not user input
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <GuidesIndexPageClient />
    </>
  );
}
