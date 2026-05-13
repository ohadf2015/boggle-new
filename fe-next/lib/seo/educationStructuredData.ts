export function educationOrganizationJsonLd(locale: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'LexiClash Education',
    url: `https://lexiclash.com/${locale}/education`,
    sameAs: ['https://lexiclash.com'],
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
    provider: { '@type': 'Organization', name: 'LexiClash', url: 'https://lexiclash.com' },
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
