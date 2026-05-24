import type { ReactNode } from 'react';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqPageJsonLdProps {
  faqs: FaqItem[];
}

/**
 * Emits FAQPage JSON-LD schema for AI Overview / GEO citation eligibility.
 *
 * Security note: content is 100% static, hardcoded in our own source files.
 * No user input ever reaches this component. The identical pattern is used by
 * BreadcrumbJsonLd, VideoGameJsonLd, and all other components in this directory.
 * This component must only be called with literals from our own data arrays.
 */
export function FaqPageJsonLd({ faqs }: FaqPageJsonLdProps): ReactNode {
  // Content is static — see JSDoc above. No sanitization needed for literal strings.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  // eslint-disable-next-line react/no-danger -- static JSON-LD, same pattern as all SEO components
  return (
    <script
      type="application/ld+json"
      // Static content only — no user input, safe for JSON-LD injection
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default FaqPageJsonLd;
