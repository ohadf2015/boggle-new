export default function robots() {
  const baseUrl = 'https://www.lexiclash.live';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/lexiclash.jpg', '/logo*.png', '/winner-celebration/'],
        disallow: ['/api/', '/_next/static/'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
      },
      {
        userAgent: 'Googlebot-Image',
        allow: ['/', '/lexiclash.jpg', '/logo*.png', '/winner-celebration/'],
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
