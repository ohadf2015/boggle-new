export default function sitemap() {
  const baseUrl = 'https://www.lexiclash.live';

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          'x-default': baseUrl,
          he: baseUrl,
          en: `${baseUrl}/en`,
          sv: `${baseUrl}/sv`,
          ja: `${baseUrl}/ja`,
        },
      },
      images: [`${baseUrl}/lexiclash.jpg`],
    },
    {
      url: `${baseUrl}/en`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
      alternates: {
        languages: {
          'x-default': baseUrl,
          he: baseUrl,
          en: `${baseUrl}/en`,
          sv: `${baseUrl}/sv`,
          ja: `${baseUrl}/ja`,
        },
      },
      images: [`${baseUrl}/lexiclash.jpg`],
    },
    {
      url: `${baseUrl}/sv`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          'x-default': baseUrl,
          he: baseUrl,
          en: `${baseUrl}/en`,
          sv: `${baseUrl}/sv`,
          ja: `${baseUrl}/ja`,
        },
      },
      images: [`${baseUrl}/lexiclash.jpg`],
    },
    {
      url: `${baseUrl}/ja`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
      alternates: {
        languages: {
          'x-default': baseUrl,
          he: baseUrl,
          en: `${baseUrl}/en`,
          sv: `${baseUrl}/sv`,
          ja: `${baseUrl}/ja`,
        },
      },
      images: [`${baseUrl}/lexiclash.jpg`],
    },
    // Legal pages - English
    {
      url: `${baseUrl}/en/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/en/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    // Legal pages - Hebrew
    {
      url: `${baseUrl}/he/legal/terms`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/he/legal/privacy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];
}
