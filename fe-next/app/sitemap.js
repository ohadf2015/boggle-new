export default function sitemap() {
  const baseUrl = 'https://www.lexiclash.live';
  const locales = ['he', 'en', 'sv', 'ja', 'es'];
  const now = new Date();

  // Use explicit locale paths for all languages for SEO consistency
  const languageAlternates = {
    'x-default': `${baseUrl}/en`,
    he: `${baseUrl}/he`,
    en: `${baseUrl}/en`,
    sv: `${baseUrl}/sv`,
    ja: `${baseUrl}/ja`,
    es: `${baseUrl}/es`,
  };

  // Common images for sitemap (helps Google discover and index images)
  const commonImages = [
    `${baseUrl}/og-image.jpg`,
    `${baseUrl}/og-image-en.jpg`,
    `${baseUrl}/og-image-he.jpg`,
    `${baseUrl}/favicon.ico`,
    `${baseUrl}/icon-192.png`,
    `${baseUrl}/icon-512.png`,
    `${baseUrl}/apple-touch-icon.png`,
  ];

  const routes = [];

  // Home pages for each locale with comprehensive image entries
  // Use explicit locale paths for all languages
  routes.push({
    url: `${baseUrl}/he`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1,
    alternates: {
      languages: languageAlternates,
    },
    images: [...commonImages, `${baseUrl}/og-image-he.jpg`],
  });

  routes.push({
    url: `${baseUrl}/en`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 1,
    alternates: {
      languages: languageAlternates,
    },
    images: [...commonImages, `${baseUrl}/og-image-en.jpg`],
  });

  routes.push({
    url: `${baseUrl}/sv`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: {
      languages: languageAlternates,
    },
    images: [...commonImages, `${baseUrl}/og-image-en.jpg`],
  });

  routes.push({
    url: `${baseUrl}/ja`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: {
      languages: languageAlternates,
    },
    images: [...commonImages, `${baseUrl}/og-image-en.jpg`],
  });

  routes.push({
    url: `${baseUrl}/es`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.9,
    alternates: {
      languages: languageAlternates,
    },
    images: [...commonImages, `${baseUrl}/og-image-en.jpg`],
  });

  // Rules pages for all locales (Game mechanics, How to Play)
  locales.forEach((locale) => {
    // Always use explicit locale path
    const localePath = `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/rules`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/rules`,
          he: `${baseUrl}/he/rules`,
          en: `${baseUrl}/en/rules`,
          sv: `${baseUrl}/sv/rules`,
          ja: `${baseUrl}/ja/rules`,
          es: `${baseUrl}/es/rules`,
        },
      },
    });
  });

  // Leaderboard pages for all locales
  locales.forEach((locale) => {
    // Always use explicit locale path
    const localePath = `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/leaderboard`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/leaderboard`,
          he: `${baseUrl}/he/leaderboard`,
          en: `${baseUrl}/en/leaderboard`,
          sv: `${baseUrl}/sv/leaderboard`,
          ja: `${baseUrl}/ja/leaderboard`,
          es: `${baseUrl}/es/leaderboard`,
        },
      },
    });
  });

  // Profile pages for all locales
  locales.forEach((locale) => {
    // Always use explicit locale path
    const localePath = `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/profile`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/profile`,
          he: `${baseUrl}/he/profile`,
          en: `${baseUrl}/en/profile`,
          sv: `${baseUrl}/sv/profile`,
          ja: `${baseUrl}/ja/profile`,
          es: `${baseUrl}/es/profile`,
        },
      },
    });
  });

  // Game mode pages for all locales
  // Singleplayer - Solo vs Bots, Practice, Challenge
  locales.forEach((locale) => {
    const localePath = `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/singleplayer`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/singleplayer`,
          he: `${baseUrl}/he/singleplayer`,
          en: `${baseUrl}/en/singleplayer`,
          sv: `${baseUrl}/sv/singleplayer`,
          ja: `${baseUrl}/ja/singleplayer`,
          es: `${baseUrl}/es/singleplayer`,
        },
      },
    });
  });

  // Daily Challenge - Same puzzle for everyone worldwide each day
  locales.forEach((locale) => {
    const localePath = `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/daily`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/daily`,
          he: `${baseUrl}/he/daily`,
          en: `${baseUrl}/en/daily`,
          sv: `${baseUrl}/sv/daily`,
          ja: `${baseUrl}/ja/daily`,
          es: `${baseUrl}/es/daily`,
        },
      },
    });
  });

  // Multiplayer - Real-time multiplayer word game
  locales.forEach((locale) => {
    const localePath = `/${locale}`;
    routes.push({
      url: `${baseUrl}${localePath}/multiplayer`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/multiplayer`,
          he: `${baseUrl}/he/multiplayer`,
          en: `${baseUrl}/en/multiplayer`,
          sv: `${baseUrl}/sv/multiplayer`,
          ja: `${baseUrl}/ja/multiplayer`,
          es: `${baseUrl}/es/multiplayer`,
        },
      },
    });
  });

  // Legal pages for all locales
  locales.forEach((locale) => {
    // Always use explicit locale path
    const localePath = `/${locale}`;

    // Legal index page
    routes.push({
      url: `${baseUrl}${localePath}/legal`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/legal`,
          he: `${baseUrl}/he/legal`,
          en: `${baseUrl}/en/legal`,
          sv: `${baseUrl}/sv/legal`,
          ja: `${baseUrl}/ja/legal`,
          es: `${baseUrl}/es/legal`,
        },
      },
    });

    // Terms of Service
    routes.push({
      url: `${baseUrl}${localePath}/legal/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
      alternates: {
        languages: {
          'x-default': `${baseUrl}/en/legal/terms`,
          he: `${baseUrl}/he/legal/terms`,
          en: `${baseUrl}/en/legal/terms`,
          sv: `${baseUrl}/sv/legal/terms`,
          ja: `${baseUrl}/ja/legal/terms`,
          es: `${baseUrl}/es/legal/terms`,
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
          'x-default': `${baseUrl}/en/legal/privacy`,
          he: `${baseUrl}/he/legal/privacy`,
          en: `${baseUrl}/en/legal/privacy`,
          sv: `${baseUrl}/sv/legal/privacy`,
          ja: `${baseUrl}/ja/legal/privacy`,
          es: `${baseUrl}/es/legal/privacy`,
        },
      },
    });
  });

  // Hebrew SEO landing page (high priority for Hebrew keyword searches)
  routes.push({
    url: `${baseUrl}/he/hebrew-multiplayer-word-game`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.95,
    alternates: {
      languages: {
        'x-default': `${baseUrl}/he/hebrew-multiplayer-word-game`,
        he: `${baseUrl}/he/hebrew-multiplayer-word-game`,
      },
    },
    images: [`${baseUrl}/og-image-he.jpg`],
  });

  return routes;
}
