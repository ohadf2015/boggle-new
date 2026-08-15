// Canonical site is www.lexiclash.live (matches metadataBase + lib/seo/educationJsonLd.ts).
// Using a second domain here previously fragmented the org entity for AI/search.
const BASE_URL = 'https://www.lexiclash.live';

// Real, existing LexiClash profiles (mirrors educationJsonLd.ts SAME_AS + layout.tsx).
const SAME_AS = [
  'https://www.instagram.com/lexi.clash',
  'https://play.google.com/store/apps/details?id=live.lexiclash.app',
];

export function educationOrganizationJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    // Same @id as buildEducationOrgJsonLd so both emissions resolve to one entity.
    '@id': `${BASE_URL}/${locale}/education#org`,
    name: 'LexiClash Education',
    url: `${BASE_URL}/${locale}/education`,
    sameAs: SAME_AS,
    description: 'Classroom word games with native multilingual support, ad-free for students.',
    inLanguage: [locale],
  };
}

export function educationFaqJsonLd(qa: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qa.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

export function educationCourseJsonLd(args: { name: string; description: string; url: string; locale: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: args.name,
    description: args.description,
    url: args.url,
    provider: { '@type': 'Organization', name: 'LexiClash', url: BASE_URL },
    inLanguage: args.locale,
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

export function speakableJsonLd(cssSelectors: string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    speakable: { '@type': 'SpeakableSpecification', cssSelector: cssSelectors },
  };
}
