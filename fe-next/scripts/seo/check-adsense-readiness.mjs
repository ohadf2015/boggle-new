#!/usr/bin/env node
// Crawls the live sitemap and fails on what a content reviewer or Googlebot would hold against it.
// Usage: node scripts/seo/check-adsense-readiness.mjs [origin]
import { readFileSync } from 'node:fs';

const origin = (process.argv[2] ?? 'https://www.lexiclash.live').replace(/\/$/, '');
const SCRIPTS = { he: /[֐-׿]/g, ru: /[Ѐ-ӿ]/g, ja: /[぀-ヿ一-鿿]/g };
const STOPWORDS = {
  en: new Set('the and of to in is you for with that your this are on it can from each how word words game play'.split(' ')),
  es: new Set('el la de que y en los las para con una un por del es tu juego palabras se más al lo como'.split(' ')),
  sv: new Set('och att det som för med en ett på är du av till spel ord de vi har kan inte om'.split(' ')),
};
const MIN_WORDS = 40;
const APP_SCREENS = [
  ...readFileSync(new URL('../../lib/seo/appScreens.ts', import.meta.url), 'utf8')
    .match(/APP_SCREEN_PATHS = \[([\s\S]*?)\]/)[1]
    .matchAll(/'([^']+)'/g),
].map((m) => m[1]);
const isAppScreen = (pathname) => APP_SCREENS.includes(pathname.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/');

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}="([^"]*)"`, 'i'))?.[1];
const tagWith = (html, re) => html.match(new RegExp(`<(?:meta|link)\\b[^>]*${re}[^>]*>`, 'i'))?.[0] ?? '';
const bodyText = (html) =>
  html
    .slice(html.indexOf('<body'))
    .replace(/<(script|style|svg|noscript|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[#\w]+;/g, ' ')
    .replace(/\s+/g, ' ');
const count = (text, re) => text.match(re)?.length ?? 0;

export function languageProblem(locale, text) {
  const middle = text.slice(Math.floor(text.length * 0.1), Math.floor(text.length * 0.8));
  if (SCRIPTS[locale]) {
    const native = count(middle, SCRIPTS[locale]);
    const latin = count(middle, /[A-Za-z]/g);
    return latin > 200 && native / (native + latin) < 0.5 ? 'body is not in the page language' : null;
  }
  if (!STOPWORDS[locale] || locale === 'en') return null;
  const words = middle.toLowerCase().match(/\p{L}+/gu) ?? [];
  const hits = (set) => words.filter((w) => set.has(w)).length;
  return words.length > 60 && hits(STOPWORDS.en) > hits(STOPWORDS[locale]) * 1.2 ? 'body is not in the page language' : null;
}

async function check(url) {
  const { pathname } = new URL(url);
  const res = await fetch(`${origin}${pathname}`, { redirect: 'manual', signal: AbortSignal.timeout(40_000) });
  if (res.status !== 200) return [`status ${res.status}`];
  const html = await res.text();
  const problems = isAppScreen(pathname) ? ['app screen listed in the sitemap'] : [];
  if (/noindex/i.test(attr(tagWith(html, 'name="robots"'), 'content') ?? '')) problems.push('noindex');
  const canonical = attr(tagWith(html, 'rel="canonical"'), 'href');
  if (canonical && canonical.replace(/\/$/, '') !== url.replace(/\/$/, '')) problems.push(`canonical is ${canonical}`);
  const locale = pathname.split('/')[1];
  const text = bodyText(html);
  const words = locale === 'ja' ? count(text, SCRIPTS.ja) / 2 : count(text, /[\p{L}\p{N}]+/gu);
  if (words < MIN_WORDS) problems.push(`only ${Math.round(words)} words in the HTML`);
  const language = languageProblem(locale, text);
  if (language) problems.push(language);
  return problems;
}

const xml = await (await fetch(`${origin}/sitemap.xml`)).text();
const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error('No URLs found in the sitemap.');
  process.exit(1);
}
const failures = [];
let next = 0;
await Promise.all(
  Array.from({ length: 4 }, async () => {
    while (next < urls.length) {
      const url = urls[next++];
      const problems = await check(url).catch((e) => [`fetch failed: ${e.message}`]);
      if (problems.length) failures.push(`${url}  ${problems.join('; ')}`);
    }
  }),
);
for (const path of APP_SCREENS) {
  for (const locale of ['en', 'he']) {
    const res = await fetch(`${origin}/${locale}${path}`, { signal: AbortSignal.timeout(40_000) }).catch(() => null);
    const robots = res?.ok ? attr(tagWith(await res.text(), 'name="robots"'), 'content') ?? '' : '';
    if (res?.ok && !/noindex/i.test(robots)) failures.push(`${origin}/${locale}${path}  app screen is indexable`);
  }
}
console.log(failures.sort().join('\n'));
console.log(`${urls.length} sitemap URLs checked, ${failures.length} with problems.`);
process.exit(failures.length ? 1 : 0);
