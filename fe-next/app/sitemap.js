export default function sitemap() {
  const baseUrl = 'https://www.lexiclash.live';
  const locales = ['he', 'en', 'sv', 'ja'];
  const now = new Date();

  const languageAlternates = {
    'x-default': baseUrl,
    he: baseUrl,
    en: `${baseUrl}/en`,
    sv: `${baseUrl}/sv`,
    ja: `${baseUrl}/ja`,
  };

  const routes = [];

  // Home pages for each locale
  routes.push({
    url: baseUrl,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1,
    alternates: {
      languages: languageAlternates,
    },
    images: [`${baseUrl}/lexiclash.jpg`],
  });

  routes.push({
    url: `${baseUrl}/en`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1,
    alternates: {
      languages: languageAlternates,
    },
    images: [`${baseUrl}/lexiclash.jpg`],
  });

  routes.push({
    url: `${baseUrl}/sv`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: {
      languages: languageAlternates,
    },
    images: [`${baseUrl}/lexiclash.jpg`],
  });

  routes.push({
    url: `${baseUrl}/ja`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: {
      languages: languageAlternates,
    },
    images: [`${baseUrl}/lexiclash.jpg`],
  });

  // Leaderboard pages for all locales
  locales.forEach((locale) => {
    const localePath = locale === 'he' ? '' : `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/leaderboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/leaderboard`,
          he: `${baseUrl}/he/leaderboard`,
          en: `${baseUrl}/en/leaderboard`,
          sv: `${baseUrl}/sv/leaderboard`,
          ja: `${baseUrl}/ja/leaderboard`,
        },
      },
    });
  });

  // Profile pages for all locales
  locales.forEach((locale) => {
    const localePath = locale === 'he' ? '' : `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/profile`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/profile`,
          he: `${baseUrl}/he/profile`,
          en: `${baseUrl}/en/profile`,
          sv: `${baseUrl}/sv/profile`,
          ja: `${baseUrl}/ja/profile`,
        },
      },
    });
  });

  // Legal pages for all locales
  locales.forEach((locale) => {
    const localePath = locale === 'he' ? '' : `/${locale}`;

    // Terms of Service
    routes.push({
      url: `${baseUrl}${localePath}/legal/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/legal/terms`,
          he: `${baseUrl}/he/legal/terms`,
          en: `${baseUrl}/en/legal/terms`,
          sv: `${baseUrl}/sv/legal/terms`,
          ja: `${baseUrl}/ja/legal/terms`,
        },
      },
    });

    // Privacy Policy
    routes.push({
      url: `${baseUrl}${localePath}/legal/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/legal/privacy`,
          he: `${baseUrl}/he/legal/privacy`,
          en: `${baseUrl}/en/legal/privacy`,
          sv: `${baseUrl}/sv/legal/privacy`,
          ja: `${baseUrl}/ja/legal/privacy`,
        },
      },
    });
  });

  return routes;
}
