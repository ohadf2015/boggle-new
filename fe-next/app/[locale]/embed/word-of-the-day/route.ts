import { getRotatedTodayWord, type Locale } from '../../word-of-the-day/content';

// Standalone, chrome-free embeddable "Word of the Day" widget.
// MUST be a Route Handler (not a page.tsx): pages under app/[locale] are wrapped
// by app/[locale]/layout.tsx which renders its own <html>/<body> + full app
// chrome/providers. A route handler bypasses all layouts → clean iframe document.
// Frameability (frame-ancestors *) is set per-route in next.config.mjs.

const SITE_URL = 'https://www.lexiclash.live';
const VALID_LOCALES: Locale[] = ['en', 'he', 'sv', 'ja', 'es'];

const EYEBROW_LABELS: Record<Locale, string> = {
  en: 'WORD OF THE DAY',
  he: 'מילת היום',
  sv: 'DAGENS ORD',
  ja: '今日の単語',
  es: 'PALABRA DEL DÍA',
};

const FOOTER_LABELS: Record<Locale, string> = {
  en: 'Powered by LexiClash — Play free →',
  he: 'מופעל על ידי LexiClash — שחקו חינם ←',
  sv: 'Drivs av LexiClash — Spela gratis →',
  ja: 'Powered by LexiClash — 無料でプレイ →',
  es: 'Con tecnología de LexiClash — Juega gratis →',
};

// Data is our own static content.ts (not user input), but we render it into a raw
// HTML string here, so escape defensively.
function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ locale: string }> }
): Promise<Response> {
  const { locale: rawLocale } = await params;
  const locale = (VALID_LOCALES.includes(rawLocale as Locale) ? rawLocale : 'en') as Locale;

  const today = new Date().toISOString().slice(0, 10);
  const word = getRotatedTodayWord(locale, today);

  const isRTL = locale === 'he';
  const q = isRTL ? '״' : '"';
  const playUrl = `${SITE_URL}/${locale}/word-of-the-day?utm_source=embed&utm_medium=widget&utm_campaign=wotd`;

  const html = `<!DOCTYPE html>
<html lang="${locale}" dir="${isRTL ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, follow" />
<title>${esc(word.word)} — ${esc(EYEBROW_LABELS[locale])} | LexiClash</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Rubik, sans-serif; background: #1a1a2e; color: #FFFEF0; }
  a { color: inherit; text-decoration: none; }
  .card { background: #1a1a2e; border: 2px solid #000; padding: 24px; display: flex; flex-direction: column; gap: 12px; min-height: 300px; height: 100%; box-shadow: 2px 2px 0 #000; }
  .eyebrow { font-size: 10px; letter-spacing: 1.5px; font-weight: 600; color: #BFFF00; text-transform: uppercase; }
  .word { font-size: 32px; font-weight: 700; line-height: 1.2; color: #FFFEF0; }
  .pos { font-size: 14px; font-style: italic; color: #BFFF00; opacity: .8; }
  .def { font-size: 14px; line-height: 1.5; color: #FFFEF0; }
  .ex { font-size: 13px; line-height: 1.4; color: #FFFEF0; opacity: .85; margin-top: auto; padding-top: 12px; border-top: 1px solid #333; }
  .footer { font-size: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #333; text-align: center; color: #BFFF00; }
  .footer:hover { opacity: .8; }
</style>
</head>
<body>
<a href="${esc(playUrl)}" target="_blank" rel="noopener" style="display:block;height:100%">
  <div class="card">
    <div class="eyebrow">${esc(EYEBROW_LABELS[locale])}</div>
    <div class="word">${esc(word.word)}</div>
    <div class="pos">${esc(word.partOfSpeech)}</div>
    <div class="def">${esc(word.definition)}</div>
    ${word.example ? `<div class="ex">${q}${esc(word.example)}${q}</div>` : ''}
    <div class="footer">${esc(FOOTER_LABELS[locale])}</div>
  </div>
</a>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      // Refresh daily; widget content rotates per day.
      'cache-control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
