import localFont from 'next/font/local';

/**
 * Font configuration using next/font/local for optimal performance
 *
 * Using @fontsource-variable packages for offline builds
 * Benefits:
 * - Zero CLS (Cumulative Layout Shift) with font-display: swap
 * - Self-hosted fonts (no external requests during build)
 * - Works in Docker/CI environments without internet
 * - Automatic font optimization
 */

export const fredoka = localFont({
  src: [
    {
      path: '../node_modules/@fontsource-variable/fredoka/files/fredoka-latin-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource-variable/fredoka/files/fredoka-hebrew-wght-normal.woff2',
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
      path: '../node_modules/@fontsource-variable/rubik/files/rubik-latin-wght-normal.woff2',
      style: 'normal',
    },
    {
      path: '../node_modules/@fontsource-variable/rubik/files/rubik-hebrew-wght-normal.woff2',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-rubik',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  preload: true,
});
