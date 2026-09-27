import Script from 'next/script';

interface FaqEntry {
  question: string;
  answer: string;
}

const BASE_URL = 'https://www.lexiclash.live';

/**
 * FAQPage structured data for rich results + AI/GEO. Content is static (from
 * translations); rendered via next/script's inline injection. `< ` is escaped to
 * `<` so an answer can never break out of the script tag.
 */
export function FaqJsonLd({ items, locale, path }: { items: FaqEntry[]; locale: string; path: string }) {
  if (!items?.length) return null;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${BASE_URL}/${locale}${path}#faq`,
    inLanguage: locale,
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.question,
      acceptedAnswer: { '@type': 'Answer', text: it.answer },
    })),
  };
  return (
    <Script id="s3d-faq-jsonld" type="application/ld+json" strategy="afterInteractive">
      {JSON.stringify(schema).replace(/</g, '\\u003c')}
    </Script>
  );
}
