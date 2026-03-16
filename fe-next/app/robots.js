export default function robots() {
  const baseUrl = 'https://www.lexiclash.live';

  // Block all crawlers for preview/staging environments
  const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
    process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

  if (isPreviewEnvironment) {
    return {
      rules: [{ userAgent: '*', disallow: '/' }],
    };
  }

  // Paths to block from crawling
  const disallowPaths = [
    '/api/',
    '/_next/static/',
    '/_next/image/',
    '/admin/',
    '/*?room=*',
  ];

  return {
    rules: [
      // Single default rule covers all search engine bots
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
