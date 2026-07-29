// JSON-LD schemas for the Teacher Pro pricing page (/{locale}/teacher/upgrade).
//
// Product + Offer with monthly UnitPriceSpecification gives Google a real
// price ($9/month) for "lexiclash pricing / teacher pro" queries — the site's
// only revenue surface previously had zero structured data, while Blooket,
// Gimkit and Wordwall all rank for "X pricing" with rich results.
//
// FAQPage mirrors the on-page FAQ EXACTLY (same translation keys the client
// renders) — Google requires FAQ structured data to match visible content.
//
// NEVER add aggregateRating / review here without real first-party reviews:
// fabricated ratings are a manual-action risk (see shopli council NO-SHIP).

const BASE_URL = 'https://www.lexiclash.live';
const SUPPORTED = new Set(['en', 'he', 'sv', 'ja', 'es', 'ru']);

interface FaqItem {
  question: string;
  answer: string;
}

interface ProductInput {
  /** Localized plan name (teacher.subscription.proPlanName). */
  name: string;
  /** Localized plan description (seo.teacherUpgrade.description). */
  description: string;
}

function safeLocale(locale: string): string {
  return SUPPORTED.has(locale) ? locale : 'en';
}

export function buildTeacherProProductJsonLd(locale: string, input: ProductInput) {
  const lang = safeLocale(locale);
  const url = `${BASE_URL}/${lang}/teacher/upgrade`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product' as const,
    '@id': `${url}#product`,
    name: input.name,
    description: input.description,
    url,
    brand: {
      '@type': 'Brand' as const,
      name: 'LexiClash',
    },
    category: 'Educational Software Subscription',
    offers: {
      '@type': 'Offer' as const,
      url,
      price: '9',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
      priceSpecification: {
        '@type': 'UnitPriceSpecification' as const,
        price: '9',
        priceCurrency: 'USD',
        // UN/CEFACT common code for "month" — $9 billed monthly.
        unitCode: 'MON',
      },
    },
  };
}

export function buildTeacherUpgradeFaqJsonLd(locale: string, faq: FaqItem[]) {
  if (!faq || faq.length === 0) return null;
  const lang = safeLocale(locale);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage' as const,
    '@id': `${BASE_URL}/${lang}/teacher/upgrade#faq`,
    mainEntity: faq.map((item) => ({
      '@type': 'Question' as const,
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer' as const,
        text: item.answer,
      },
    })),
  };
}
