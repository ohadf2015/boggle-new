import { Font } from '@react-pdf/renderer';

/**
 * Fonts for the exported progress reports.
 *
 * react-pdf's built-in Helvetica has no Hebrew, Cyrillic or Japanese glyphs, so
 * a translated report printed as empty boxes. Each export uses ONE family that
 * covers the teacher's whole language plus Latin (student names, digits, %):
 * per-glyph `fontFamily: [a, b]` fallback across subset fonts drew wrong glyphs
 * when probed on @react-pdf/renderer 4.3.2.
 *
 * Files live in public/fonts/pdf (static TTF — the site's woff2 subsets throw
 * inside fontkit). Rubik-Regular/Bold are wght=400/700 instances of Google's
 * Rubik[wght] with distinct PostScript names, otherwise react-pdf dedupes the
 * two faces and bold never embeds.
 */
const RUBIK = 'ReportRubik';
const NOTO_JP = 'ReportNotoSansJP';

const registered = new Set<string>();

export function registerReportFonts(language: string, base = ''): string {
  const family = language === 'ja' ? NOTO_JP : RUBIK;
  const file = family === NOTO_JP ? 'NotoSansJP' : 'Rubik';
  const key = `${family}@${base}`;

  if (!registered.has(key)) {
    Font.register({
      family,
      fonts: [
        { src: `${base}/fonts/pdf/${file}-Regular.ttf`, fontWeight: 400 },
        { src: `${base}/fonts/pdf/${file}-Bold.ttf`, fontWeight: 700 },
      ],
    });
    // The default hyphenator is English-only and splits Hebrew/Japanese words
    // mid-glyph-run; a word is one unit on a report.
    Font.registerHyphenationCallback((word) => [word]);
    registered.add(key);
  }
  return family;
}
