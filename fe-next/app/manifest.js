export default function manifest() {
  return {
    id: '/',
    scope: '/',
    short_name: 'LexiClash',
    name: 'LexiClash - Multiplayer Word Game',
    description: 'Fast-paced multiplayer word game perfect for parties, team building, and family fun. Find words, compete in real-time!',
    lang: 'en',
    dir: 'auto',
    icons: [
      {
        src: '/favicon.ico',
        sizes: '48x48 32x32 16x16',
        type: 'image/x-icon',
      },
      {
        src: '/icon-48.png',
        type: 'image/png',
        sizes: '48x48',
        purpose: 'any',
      },
      {
        src: '/icon-72.png',
        type: 'image/png',
        sizes: '72x72',
        purpose: 'any',
      },
      {
        src: '/icon-96.png',
        type: 'image/png',
        sizes: '96x96',
        purpose: 'any',
      },
      {
        src: '/icon-144.png',
        type: 'image/png',
        sizes: '144x144',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'any',
      },
      {
        src: '/icon-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/phone-1.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'LexiClash multiplayer word game',
      },
      {
        src: '/screenshots/phone-2.png',
        sizes: '1080x1920',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Real-time word battles with friends',
      },
    ],
    start_url: '/en',
    display: 'standalone',
    orientation: 'any',
    theme_color: '#667eea',
    background_color: '#4a4a7a',
    categories: ['games', 'entertainment'],
    related_applications: [
      {
        platform: 'play',
        id: 'live.lexiclash.app',
        url: 'https://play.google.com/store/apps/details?id=live.lexiclash.app',
      },
    ],
    prefer_related_applications: false,
  };
}
