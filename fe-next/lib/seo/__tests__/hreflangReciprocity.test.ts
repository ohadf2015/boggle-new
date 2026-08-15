/**
 * hreflang has to be reciprocal, and 38 of our 65 landing pages were not.
 *
 * Google only honours an `hreflang` annotation when the page it points at points BACK. An
 * unconfirmed annotation is not merely ignored: when many pages claim the same alternate, the
 * cluster is contradictory, and Google is free to decide which URL to show for which language.
 * `swedish-multiplayer-word-game` was claimed as "my Swedish version" by 19 different pages;
 * `juego-de-palabras-multijugador` by 13.
 *
 * That is not a theoretical defect. /es/juego-de-palabras-multijugador carries ~54,000
 * impressions at average position 5.5 and earns 0.51% CTR — and 2.4% even when it ranks 1–3,
 * which is what "the wrong page is being shown to the wrong language" looks like from the
 * outside: seen, then passed over.
 *
 * The two shared helpers (generatePageMetadata, enOnlyAlternates) are reciprocal by
 * construction. Only the hand-written `languages: { … }` blocks on the localized-slug landing
 * pages could drift, and they did. This test reads them the way Google does.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sitemap from '../../../app/sitemap';

const APP_DIR = join(process.cwd(), 'app', '[locale]');

/** slug -> the alternates it declares, as lang -> path-after-origin. */
function declaredAlternates(): Map<string, { file: string; langs: Map<string, string> }> {
  const out = new Map<string, { file: string; langs: Map<string, string> }>();
  const walk = (dir: string, parts: string[]) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full, [...parts, entry]);
      } else if (entry === 'page.tsx') {
        const src = readFileSync(full, 'utf8');
        const block = src.match(/languages: \{([\s\S]*?)\n\s*\},/);
        if (!block) continue;
        const langs = new Map<string, string>();
        // A page may declare its own URL through the `pageUrl` const instead of a BASE_URL
        // template. That is still a self-reference, and the single-locale pages (the Russian
        // set, the Spanish classroom page) are written that way.
        const selfRef = /'?[a-zA-Z-]+'?\s*:\s*pageUrl\s*,/.test(block[1]);
        for (const line of block[1].split('\n')) {
          const m = line.match(/'?([a-zA-Z-]+)'?\s*:\s*`\$\{BASE_URL\}([^`]*)`/);
          if (!m) {
            if (selfRef && /:\s*pageUrl\s*,/.test(line)) {
              const lang = line.match(/'?([a-zA-Z-]+)'?\s*:/);
              if (lang) langs.set(lang[1], `/SELF/${parts.join('/')}`);
            }
            continue;
          }
          // `${BASE_URL}/en${PAGE_PATH}` — the same path under a different locale, which is the
          // reciprocal-by-construction shape generatePageMetadata uses. Nothing to check.
          if (m[2].includes('${')) continue;
          langs.set(m[1], m[2]);
        }
        if (langs.size > 0) out.set(parts.join('/'), { file: full, langs });
      }
    }
  };
  walk(APP_DIR, []);
  return out;
}

/** The slug an alternate URL refers to, with its leading /<locale> stripped. */
function slugOf(url: string): string {
  if (url.startsWith('/SELF/')) return url.slice('/SELF/'.length);
  return url.replace(/^\/[a-z]{2}\//, '').replace(/^\/[a-z]{2}$/, '');
}

describe('hreflang clusters', () => {
  const declared = declaredAlternates();

  it('finds the landing pages that hand-write their own alternates', () => {
    // If this drops to zero the scan has rotted and every assertion below passes vacuously.
    expect(declared.size).toBeGreaterThan(20);
  });

  it('never points at a page that does not point back', () => {
    const unconfirmed: string[] = [];
    for (const [slug, { langs }] of Array.from(declared.entries())) {
      for (const [lang, url] of Array.from(langs.entries())) {
        if (lang === 'x-default') continue;
        const target = slugOf(url);
        if (target === slug) continue; // self-reference is always valid
        const targetPage = declared.get(target);
        const pointsBack =
          targetPage && Array.from(targetPage.langs.values()).some((u) => slugOf(u) === slug);
        if (!pointsBack) unconfirmed.push(`${slug}: ${lang} -> ${url}`);
      }
    }
    expect(unconfirmed, `unconfirmed hreflang (Google ignores these):\n${unconfirmed.join('\n')}`).toEqual([]);
  });

  // Deliberately NOT asserted: "no two pages claim the same alternate". A genuine five-language
  // cluster has all five pages pointing at the same five URLs — that is what a cluster IS. The
  // first version of this test banned it and would have broken the one cluster on the site that
  // was already correct. Reciprocity is the whole rule; sharing is only a symptom of breaking it.

  it('always declares itself', () => {
    // A cluster without a self-reference is invalid even when every other link is reciprocal.
    const missing: string[] = [];
    for (const [slug, { langs }] of Array.from(declared.entries())) {
      if (!Array.from(langs.values()).some((u) => slugOf(u) === slug)) missing.push(slug);
    }
    expect(missing, `pages whose hreflang omits themselves:\n${missing.join('\n')}`).toEqual([]);
  });
});

/**
 * The sitemap is a SECOND, independent declaration of the same clusters.
 *
 * Google treats sitemap hreflang and page hreflang as equal statements, so fixing only the pages
 * leaves the contradiction live — which is exactly what happened on the first pass here. This
 * block asserts against the RENDERED routes rather than the source text, because sitemap.ts
 * builds most entries through helpers and a regex over it would check the wrong thing.
 */
describe('sitemap hreflang clusters', () => {
  const routes = sitemap() as { url: string; alternates?: { languages?: Record<string, string> } }[];
  const byUrl = new Map(routes.map((r) => [r.url, r.alternates?.languages ?? {}]));

  it('emits a sitemap with alternates at all', () => {
    expect(routes.length).toBeGreaterThan(50);
    expect([...byUrl.values()].filter((l) => Object.keys(l).length > 0).length).toBeGreaterThan(20);
  });

  it('never points at a URL that does not point back', () => {
    const unconfirmed: string[] = [];
    for (const [url, langs] of Array.from(byUrl.entries())) {
      for (const [lang, target] of Object.entries(langs)) {
        // x-default may legitimately hand off to another cluster's canonical.
        if (lang === 'x-default' || target === url) continue;
        const targetLangs = byUrl.get(target);
        if (!targetLangs) {
          unconfirmed.push(`${url}: ${lang} -> ${target} (target is not a sitemap entry)`);
        } else if (!Object.values(targetLangs).includes(url)) {
          unconfirmed.push(`${url}: ${lang} -> ${target} (no return link)`);
        }
      }
    }
    expect(unconfirmed, `unconfirmed sitemap hreflang:\n${unconfirmed.join('\n')}`).toEqual([]);
  });
});
