/**
 * Page JSON-LD must be in the server-rendered HTML.
 *
 * An inline next/script `<Script type="application/ld+json">{json}</Script>` is not emitted as a
 * <script> tag in the SSR HTML: its body only travels in the RSC flight payload and is injected
 * after hydration. Crawlers that do not execute JavaScript (Bingbot for AI grounding, GPTBot,
 * ClaudeBot, PerplexityBot) therefore never see the FAQPage/HowTo/Breadcrumb schema. Verified on
 * production 2026-10-16: /en/scrabble-alternative-online served one ld+json tag (the layout's)
 * and no FAQPage, while pages using a raw <script dangerouslySetInnerHTML> served theirs.
 *
 * Third-party *src* scripts still belong in next/script (see headScriptsHydration.test.ts); this
 * rule is only about inline structured data.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const DIRS = ['app', 'components'].map((d) => join(ROOT, d));

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx$/.test(name) && !/\.test\.tsx$/.test(name)) out.push(p);
  }
  return out;
}

describe('JSON-LD is server-rendered', () => {
  it('no inline next/script <Script type="application/ld+json">', () => {
    const offenders = DIRS.flatMap((d) => walk(d)).filter((f) =>
      /<Script\b[^>]*type=["']application\/ld\+json["']/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders.map((f) => relative(ROOT, f))).toEqual([]);
  });
});
