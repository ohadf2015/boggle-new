export default function robots() {
  const baseUrl = 'https://www.lexiclash.live';

  // Check if this is a preview/staging environment (explicitly set or PR preview)
  // Only block indexing when NEXT_PUBLIC_IS_PREVIEW is explicitly true or when it's a PR preview
  const isPreviewEnvironment = process.env.NEXT_PUBLIC_IS_PREVIEW === 'true' ||
    process.env.RAILWAY_ENVIRONMENT_NAME?.startsWith('pr-');

  // Block all crawlers for preview/staging environments
  if (isPreviewEnvironment) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: '/',
        },
      ],
    };
  }

  // Common allowed paths for all bots
  const commonAllowPaths = [
    '/',
    // Favicon and icons - critical for search engine crawling
    '/favicon.ico',
    '/favicon.svg',
    '/icon-*.png',
    '/apple-touch-icon.png',
    // Social/OG images - essential for rich snippets
    '/og-image.jpg',
    '/og-image-*.jpg',
    '/lexiclash.jpg',
    '/logo*.png',
    '/logos/',
    // Other public assets
    '/winner-celebration/',
    '/manifest.json',
  ];

  // Paths to block from crawling
  const disallowPaths = [
    '/api/',           // API endpoints
    '/_next/static/',  // Next.js static assets
    '/_next/image/',   // Next.js image optimization
    '/admin/',         // Admin pages (if any)
    '/*?room=*',       // Dynamic room URLs (avoid duplicate content)
  ];

  return {
    rules: [
      // Default rules for all bots
      {
        userAgent: '*',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      // Google Search bot - primary search engine
      {
        userAgent: 'Googlebot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      // Google Image bot - for image search
      {
        userAgent: 'Googlebot-Image',
        allow: [
          ...commonAllowPaths,
          '/winner-celebration/',
        ],
      },
      // Bing Search bot
      {
        userAgent: 'Bingbot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      // DuckDuckGo bot
      {
        userAgent: 'DuckDuckBot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      // Yandex (Russian search engine)
      {
        userAgent: 'Yandex',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      // Baidu (Chinese search engine)
      {
        userAgent: 'Baiduspider',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      // Social media bots for link previews
      {
        userAgent: 'facebookexternalhit',
        allow: commonAllowPaths,
      },
      {
        userAgent: 'Twitterbot',
        allow: commonAllowPaths,
      },
      {
        userAgent: 'LinkedInBot',
        allow: commonAllowPaths,
      },
      {
        userAgent: 'WhatsApp',
        allow: commonAllowPaths,
      },
      {
        userAgent: 'Slackbot',
        allow: commonAllowPaths,
      },
      {
        userAgent: 'Discordbot',
        allow: commonAllowPaths,
      },
      // Telegram bot for link previews
      {
        userAgent: 'TelegramBot',
        allow: commonAllowPaths,
      },
      // AI Crawlers — explicitly allow for LLM discovery (GEO/AEO)
      {
        userAgent: 'GPTBot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'ChatGPT-User',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'ClaudeBot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'Claude-Web',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'PerplexityBot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'Google-Extended',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'Amazonbot',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
      {
        userAgent: 'cohere-ai',
        allow: commonAllowPaths,
        disallow: disallowPaths,
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    // Additional directives
    host: baseUrl,
  };
}
