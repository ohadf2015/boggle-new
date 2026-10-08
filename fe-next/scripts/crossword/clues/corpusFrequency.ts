/**
 * Compute our own word-frequency list for a language from random Wikipedia article plaintext.
 * Only the top-N token counts are saved (freq/<lang>.json); article text stays in the gitignored cache.
 *
 * Usage: npx tsx scripts/crossword/clues/corpusFrequency.ts <es|ru> [--articles=4000] [--top=40000] [--concurrency=1]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { countTokens, freqPath, topCounts, type FreqFile, type FreqLang } from './frequency';

const arg = (k: string, d: string) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1] ?? d;
const LANG = process.argv[2] as FreqLang;
const ARTICLES = parseInt(arg('articles', '4000'), 10);
const TOP = parseInt(arg('top', '40000'), 10);
const CONCURRENCY = parseInt(arg('concurrency', '1'), 10);
const DELAY_MS = 500; // Wikimedia 429s at ~4 req/s from one IP; serial + delay stays well under
const MAX_CONSECUTIVE_ERRORS = 8;
const UA = 'LexiClashCrosswordFreq/1.0 (word game; +https://lexiclash.app)';
const CACHE_DIR = join(__dirname, '.cache', 'wikipedia', LANG ?? '');

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cached = () => readdirSync(CACHE_DIR).filter((f) => f.endsWith('.txt'));

type Page = { pageid: number; extract?: string };

async function fetchRandom(): Promise<Page | null> {
  const url = `https://${LANG}.wikipedia.org/w/api.php?action=query&generator=random&grnnamespace=0&grnlimit=1&prop=extracts&explaintext=1&format=json&formatversion=2&maxlag=5`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } });
  if (!res.ok) throw Object.assign(new Error(`HTTP ${res.status} ${res.statusText} from ${url}`), { retryAfter: Number(res.headers.get('retry-after')) || 0 });
  const data = (await res.json()) as { error?: { code: string; info: string }; query?: { pages?: Page[] } };
  if (data.error) throw new Error(`API error ${data.error.code}: ${data.error.info}`);
  return data.query?.pages?.[0] ?? null;
}

async function worker(state: { have: number; errors: number; lastError: string }) {
  while (state.have < ARTICLES) {
    try {
      const page = await fetchRandom();
      state.errors = 0;
      const p = page && join(CACHE_DIR, `${page.pageid}.txt`);
      if (page?.extract && p && !existsSync(p)) {
        writeFileSync(p, page.extract);
        state.have++;
        if (state.have % 250 === 0) console.log(`${LANG}: ${state.have}/${ARTICLES} articles`);
      }
    } catch (e) {
      state.lastError = (e as Error).message;
      if (++state.errors >= MAX_CONSECUTIVE_ERRORS) throw new Error(`stopping after ${state.errors} consecutive errors; last: ${state.lastError}`);
      await sleep(Math.max(1000 * ((e as { retryAfter?: number }).retryAfter ?? 0), 15000 * state.errors));
    }
    await sleep(DELAY_MS);
  }
}

async function main() {
  if (LANG !== 'es' && LANG !== 'ru') throw new Error('usage: corpusFrequency.ts <es|ru> [--articles=N]');
  mkdirSync(CACHE_DIR, { recursive: true });
  const state = { have: cached().length, errors: 0, lastError: '' };
  console.log(`${LANG}: ${state.have} cached, target ${ARTICLES}`);
  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(state)));

  const files = cached().slice(0, ARTICLES);
  // section headings ("== Referencias ==") are page chrome, not prose
  const texts = files.map((f) => readFileSync(join(CACHE_DIR, f), 'utf8').replace(/^=+.*=+\s*$/gm, ''));
  const counts = countTokens(texts, LANG);
  const tokens = [...counts.values()].reduce((a, b) => a + b, 0);
  const out: FreqFile = { lang: LANG, articles: files.length, tokens, top: topCounts(counts, TOP) };
  mkdirSync(join(__dirname, 'freq'), { recursive: true });
  writeFileSync(freqPath(LANG), `${JSON.stringify(out)}\n`);
  console.log(`DONE ${LANG}: ${files.length} articles, ${tokens} tokens, ${counts.size} types -> top ${out.top.length} in ${freqPath(LANG)}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
