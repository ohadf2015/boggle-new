import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'Disclaimer | LexiClash',
  he: 'הצהרת אחריות | לקסיקלאש',
  sv: 'Ansvarsfriskrivning | LexiClash',
  ja: '免責事項 | LexiClash',
  es: 'Aviso Legal | LexiClash',
};

const descriptionMap: Record<string, string> = {
  en: 'LexiClash disclaimer — information about our content, limitations of liability, third-party links, and advertising content policies.',
  he: 'הצהרת אחריות של לקסיקלאש — מידע על התוכן שלנו, מגבלות אחריות, קישורים לצד שלישי ומדיניות תוכן פרסומי.',
  sv: 'LexiClash ansvarsfriskrivning — information om vårt innehåll, ansvarsbegränsningar, tredjepartslänkar och annonspolicyer.',
  ja: 'LexiClash免責事項 — コンテンツ、責任制限、サードパーティリンク、広告コンテンツポリシーについて。',
  es: 'Aviso legal de LexiClash — información sobre nuestro contenido, limitaciones de responsabilidad, enlaces de terceros y políticas de contenido publicitario.',
};

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  return {
    title: titleMap[locale] || titleMap.en,
    description: descriptionMap[locale] || descriptionMap.en,
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/legal/disclaimer`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/legal/disclaimer',
        he: 'https://www.lexiclash.live/he/legal/disclaimer',
        en: 'https://www.lexiclash.live/en/legal/disclaimer',
        sv: 'https://www.lexiclash.live/sv/legal/disclaimer',
        ja: 'https://www.lexiclash.live/ja/legal/disclaimer',
        es: 'https://www.lexiclash.live/es/legal/disclaimer',
        'en-IL': 'https://www.lexiclash.live/en/legal/disclaimer',
        'he-IL': 'https://www.lexiclash.live/he/legal/disclaimer',
        'en-US': 'https://www.lexiclash.live/en/legal/disclaimer',
        'es-US': 'https://www.lexiclash.live/es/legal/disclaimer',
        'en-GB': 'https://www.lexiclash.live/en/legal/disclaimer',
        'en-SE': 'https://www.lexiclash.live/en/legal/disclaimer',
        'sv-SE': 'https://www.lexiclash.live/sv/legal/disclaimer',
        'en-JP': 'https://www.lexiclash.live/en/legal/disclaimer',
        'ja-JP': 'https://www.lexiclash.live/ja/legal/disclaimer',
        'en-ES': 'https://www.lexiclash.live/en/legal/disclaimer',
        'es-ES': 'https://www.lexiclash.live/es/legal/disclaimer',
        'en-MX': 'https://www.lexiclash.live/en/legal/disclaimer',
        'es-MX': 'https://www.lexiclash.live/es/legal/disclaimer',
        'en-AU': 'https://www.lexiclash.live/en/legal/disclaimer',
        'es-AR': 'https://www.lexiclash.live/es/legal/disclaimer',
        'es-CO': 'https://www.lexiclash.live/es/legal/disclaimer',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface DisclaimerLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function DisclaimerLayout({ children, params }: DisclaimerLayoutProps): Promise<ReactNode> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  // BreadcrumbList schema — hardcoded (no user input), safe for JSON injection
  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `https://www.lexiclash.live${localePath}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Legal',
        item: `https://www.lexiclash.live${localePath}/legal`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Disclaimer',
        item: `https://www.lexiclash.live${localePath}/legal/disclaimer`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {children}
    </>
  );
}
