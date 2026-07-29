import type { Metadata } from 'next';
import type { ReactNode } from 'react';

interface LayoutParams {
  params: Promise<{ locale: string }>;
}

const titleMap: Record<string, string> = {
  en: 'Cookie Policy | LexiClash',
  he: 'מדיניות עוגיות | לקסיקלאש',
  sv: 'Cookiepolicy | LexiClash',
  ja: 'Cookieポリシー | LexiClash',
  es: 'Política de Cookies | LexiClash',
};

const descriptionMap: Record<string, string> = {
  en: 'Learn how LexiClash uses cookies and similar technologies. Understand what cookies we use, why, and how to manage them.',
  he: 'למדו כיצד לקסיקלאש משתמש בעוגיות וטכנולוגיות דומות. הבינו אילו עוגיות אנו משתמשים, מדוע, וכיצד לנהל אותן.',
  sv: 'Lär dig hur LexiClash använder cookies och liknande teknologier. Förstå vilka cookies vi använder, varför och hur du hanterar dem.',
  ja: 'LexiClashがCookieと類似技術をどのように使用するかについて。使用するCookieの種類、理由、管理方法をご確認ください。',
  es: 'Aprende cómo LexiClash usa cookies y tecnologías similares. Comprende qué cookies usamos, por qué y cómo gestionarlas.',
};

export async function generateMetadata({ params }: LayoutParams): Promise<Metadata> {
  const { locale } = await params;
  const localePath = `/${locale}`;

  return {
    title: titleMap[locale] || titleMap.en,
    description: descriptionMap[locale] || descriptionMap.en,
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/legal/cookies`,
      languages: {
        'x-default': 'https://www.lexiclash.live/en/legal/cookies',
        he: 'https://www.lexiclash.live/he/legal/cookies',
        en: 'https://www.lexiclash.live/en/legal/cookies',
        sv: 'https://www.lexiclash.live/sv/legal/cookies',
        ja: 'https://www.lexiclash.live/ja/legal/cookies',
        es: 'https://www.lexiclash.live/es/legal/cookies',
        'en-IL': 'https://www.lexiclash.live/en/legal/cookies',
        'he-IL': 'https://www.lexiclash.live/he/legal/cookies',
        'en-US': 'https://www.lexiclash.live/en/legal/cookies',
        'es-US': 'https://www.lexiclash.live/es/legal/cookies',
        'en-GB': 'https://www.lexiclash.live/en/legal/cookies',
        'en-SE': 'https://www.lexiclash.live/en/legal/cookies',
        'sv-SE': 'https://www.lexiclash.live/sv/legal/cookies',
        'en-JP': 'https://www.lexiclash.live/en/legal/cookies',
        'ja-JP': 'https://www.lexiclash.live/ja/legal/cookies',
        'en-ES': 'https://www.lexiclash.live/en/legal/cookies',
        'es-ES': 'https://www.lexiclash.live/es/legal/cookies',
        'en-MX': 'https://www.lexiclash.live/en/legal/cookies',
        'es-MX': 'https://www.lexiclash.live/es/legal/cookies',
        'en-AU': 'https://www.lexiclash.live/en/legal/cookies',
        'es-AR': 'https://www.lexiclash.live/es/legal/cookies',
        'es-CO': 'https://www.lexiclash.live/es/legal/cookies',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

interface CookiesLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export default async function CookiesLayout({ children, params }: CookiesLayoutProps): Promise<ReactNode> {
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
        name: 'Cookie Policy',
        item: `https://www.lexiclash.live${localePath}/legal/cookies`,
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
