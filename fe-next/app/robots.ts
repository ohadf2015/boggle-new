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

  // AI + search crawlers — explicit Allow signals welcome for citation/training.
  // Same disallow set as default to block share/UTM duplicates.
  //
  // YandexBot is here for a search reason rather than an AI one: Yandex carries
  // the majority of Russian search, and we ship a Russian puzzle bank plus seven
  // Russian keyword landings. Yandex Webmaster looks for an explicit rule; before
  // 2026-08-09 the crawler only ever matched the catch-all `*`.
  const aiBots = [
    'YandexBot',
    'YandexImages',
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
