export default function robots() {
  const baseUrl = 'https://www.lexiclash.live';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          // Favicon and icons - critical for Google crawling
          '/favicon.ico',
          '/icon-*.png',
          '/apple-touch-icon.png',
          // Social/OG images
          '/og-image.jpg',
          '/og-image-*.jpg',
          '/lexiclash.jpg',
          '/logo*.png',
          '/logos/',
          // Other assets
          '/winner-celebration/',
          '/manifest.json',
        ],
        disallow: ['/api/', '/_next/static/', '/_next/image/'],
      },
      {
        userAgent: 'Googlebot',
        allow: [
          '/',
          '/favicon.ico',
          '/icon-*.png',
          '/apple-touch-icon.png',
          '/og-image.jpg',
          '/og-image-*.jpg',
        ],
      },
      {
        userAgent: 'Googlebot-Image',
        allow: [
          '/',
          '/favicon.ico',
          '/icon-*.png',
          '/apple-touch-icon.png',
          '/og-image.jpg',
          '/og-image-*.jpg',
          '/lexiclash.jpg',
          '/logo*.png',
          '/logos/',
          '/winner-celebration/',
        ],
      },
      {
        userAgent: 'Bingbot',
        allow: [
          '/',
          '/favicon.ico',
          '/icon-*.png',
          '/og-image.jpg',
          '/og-image-*.jpg',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
