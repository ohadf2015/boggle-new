import { Fredoka, Rubik } from 'next/font/google';

/**
 * Font configuration using next/font for optimal performance
 *
 * Benefits over Google Fonts link:
 * - Zero CLS (Cumulative Layout Shift) with font-display: swap auto-handled
 * - Self-hosted fonts (no external requests)
 * - Automatic font subsetting
 * - Preloaded and inlined CSS
 */

export const fredoka = Fredoka({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-fredoka',
  // Fallback fonts to minimize CLS during font load
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  // Preload for above-the-fold content
  preload: true,
});

export const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-rubik',
  fallback: ['system-ui', 'Arial', 'sans-serif'],
  preload: true,
});
