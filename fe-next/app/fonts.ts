import localFont from 'next/font/local';

/**
 * Font configuration using local fonts for optimal performance
 *
 * Benefits of local fonts:
 * - Zero CLS (Cumulative Layout Shift) with font-display: swap
 * - No external network requests (fixes Turbopack build issues)
 * - Faster build times
 * - Preloaded and inlined CSS
 *
 * LOCALE-CONDITIONAL PRELOADING NOTE:
 * next/font/local does not support locale-conditional preloading natively.
 * When preload: true is set with multiple src entries, Next.js generates
 * <link rel="preload"> for each font file, meaning Hebrew users receive
 * Latin preloads and vice versa.
 *
 * To minimise wasted preloads we split font families into two separate
 * localFont calls: one per script. Each is preloaded independently.
 * The root layout at app/[locale]/layout.tsx should include only the
 * font variable(s) relevant to the active locale.
 *
 * DONE: Locale-specific font variables wired in app/[locale]/layout.tsx:
 *   - locales ['en','sv','ja','es'] → fredokaLatin + rubikLatin
 *   - locale  'he'                 → all 4 fonts (Latin + Hebrew)
 * Saves ~60-80KB of preloaded fonts per non-Hebrew page visit.
 */

// Latin script fonts (English, Swedish, Japanese, Spanish)
export const fredokaLatin = localFont({
  src: [
    {
      path: '../public/fonts/fredoka-latin.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-fredoka',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  preload: true,
});

// Hebrew script font
export const fredokaHebrew = localFont({
  src: [
    {
      path: '../public/fonts/fredoka-hebrew.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-fredoka-hebrew',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  // preload: false — only preload when locale is 'he' (see layout.tsx TODO above)
  preload: false,
});

// Latin + extended Latin (English, Swedish, Spanish)
export const rubikLatin = localFont({
  src: [
    {
      path: '../public/fonts/rubik-latin.woff2',
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

// Hebrew script body font
export const rubikHebrew = localFont({
  src: [
    {
      path: '../public/fonts/rubik-hebrew.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-rubik-hebrew',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  // preload: false — only preload when locale is 'he' (see layout.tsx TODO above)
  preload: false,
});

// Hebrew gamified body font — Heebo: clean, modern, variable weight 400-700
export const heeboHebrew = localFont({
  src: [
    {
      path: '../public/fonts/heebo-hebrew.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-heebo-hebrew',
  fallback: ['var(--font-rubik-hebrew)', 'system-ui', 'Arial', 'sans-serif'],
  preload: false,
});

/**
 * Combined exports — used by app/[locale]/layout.tsx.
 * Include both Latin and Hebrew sources so the browser can load
 * the correct glyphs on demand via unicode-range matching.
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
      path: '../public/fonts/rubik-latin-ext.woff2',
      weight: '400 700',
      style: 'normal',
    },
    {
      path: '../public/fonts/rubik-hebrew.woff2',
      weight: '400 700',
      style: 'normal',
    },
  ],
  display: 'swap',
  variable: '--font-rubik',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  preload: true,
});
