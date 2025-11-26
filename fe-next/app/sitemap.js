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
  ];
}
