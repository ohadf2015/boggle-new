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
        },
      },
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
        },
      },
    },
  ];
}
