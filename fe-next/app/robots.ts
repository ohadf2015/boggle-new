import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
  // Share/tracking params are blocked to prevent duplicate-content dilution:
  // multiple URLs resolve to the same canonical page, and crawlers waste budget
  // on parametrized variants that add no unique value.
  const disallowPaths = [
    '/api/',
    '/_next/static/',
    '/_next/image/',
    '/admin/',
    '/*?room=*',
    '/*?share=*',
    '/*?ref=*',
    '/*?referrer=*',
    '/*?utm_source=*',
    '/*?utm_medium=*',
    '/*?utm_campaign=*',
    '/*?utm_term=*',
    '/*?utm_content=*',
    '/*?fbclid=*',
    '/*?gclid=*',
  ];

  // AI crawlers — explicit Allow signals welcome for citation/training.
  // Same disallow set as default to block share/UTM duplicates.
  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-Web',
    'anthropic-ai',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Googlebot',
    'Bingbot',
    'CCBot',
    'Applebot',
    'Applebot-Extended',
    'FacebookBot',
    'Meta-ExternalAgent',
    'Bytespider',
    'Amazonbot',
    'cohere-ai',
    'DuckAssistBot',
    'MistralAI-User',
    'YouBot',
  ];

  return {
    rules: [
      // AdMob / Google ads crawler — must be explicitly allowed for ad serving
      {
        userAgent: 'Mediapartners-Google',
        allow: '/',
      },
      // Google Display Ads crawler
      {
        userAgent: 'Google-Display-Ads-Bot',
        allow: '/',
      },
      // Explicit AI/search crawlers — welcome for citation, subject to duplicate-content guards
      ...aiBots.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: disallowPaths,
      })),
      // Default rule for all other crawlers
      {
        userAgent: '*',
        allow: '/',
        disallow: disallowPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
