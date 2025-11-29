import { translations } from '@/translations';

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const seo = translations[locale]?.seo?.terms || translations.en.seo.terms;
  const baseSeo = translations[locale]?.seo || translations.en.seo;

  const localePath = locale === 'he' ? '' : `/${locale}`;

  return {
    title: seo.title,
    description: seo.description,
    openGraph: {
      type: 'website',
      locale: baseSeo.locale,
      url: `https://www.lexiclash.live${localePath}/legal/terms`,
      title: seo.ogTitle,
      description: seo.ogDescription,
      siteName: 'LexiClash',
      images: [
        {
          url: 'https://www.lexiclash.live/lexiclash.jpg',
          width: 1200,
          height: 630,
          alt: 'LexiClash - Multiplayer Word Game',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: seo.ogTitle,
      description: seo.ogDescription,
      images: ['https://www.lexiclash.live/lexiclash.jpg'],
    },
    alternates: {
      canonical: `https://www.lexiclash.live${localePath}/legal/terms`,
      languages: {
        'x-default': 'https://www.lexiclash.live/legal/terms',
        he: 'https://www.lexiclash.live/he/legal/terms',
        en: 'https://www.lexiclash.live/en/legal/terms',
        sv: 'https://www.lexiclash.live/sv/legal/terms',
        ja: 'https://www.lexiclash.live/ja/legal/terms',
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function TermsLayout({ children, params }) {
  const { locale } = await params;
  const localePath = locale === 'he' ? '' : `/${locale}`;

  // Breadcrumb structured data
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
        name: 'Terms of Service',
        item: `https://www.lexiclash.live${localePath}/legal/terms`,
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
