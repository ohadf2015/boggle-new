import localFont from 'next/font/local';

/**
 * Font configuration using local fonts for optimal performance
 *
 * Benefits of local fonts:
 * - Zero CLS (Cumulative Layout Shift) with font-display: swap
 * - No external network requests (fixes Turbopack build issues)
 * - Faster build times
 * - Preloaded and inlined CSS
 */

export const fredoka = localFont({
  src: [
    {
      path: '../public/fonts/fredoka-latin.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: '../public/fonts/fredoka-hebrew.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-fredoka',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  preload: true,
});

export const rubik = localFont({
  src: [
    {
      path: '../public/fonts/rubik-latin.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: '../public/fonts/rubik-hebrew.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: '../public/fonts/rubik-latin-ext.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-rubik',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  preload: true,
});
