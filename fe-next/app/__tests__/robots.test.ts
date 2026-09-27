import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import robots from '../robots';

type Rule = { userAgent?: string | string[]; allow?: string | string[]; disallow?: string | string[] };

const rulesOf = () => {
  const r = robots().rules;
  return (Array.isArray(r) ? r : [r]) as Rule[];
};

const agents = (rules: Rule[]) =>
  rules.flatMap((rule) => (Array.isArray(rule.userAgent) ? rule.userAgent : [rule.userAgent ?? '']));

describe('robots.txt', () => {
  /**
   * Yandex carries the majority of Russian search. We ship six Russian keyword
   * landings and a Russian puzzle bank, and as of 2026-08-09 the repo contained
   * zero Yandex references — the crawler only ever matched the catch-all `*`.
   * An explicit rule is the signal Yandex Webmaster looks for.
   */
  it('explicitly allows YandexBot', () => {
    const rules = rulesOf();
    expect(agents(rules)).toContain('YandexBot');
    const yandex = rules.find((r) =>
      (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes('YandexBot')
    );
    expect(yandex?.allow).toBe('/');
  });

  it('applies the same duplicate-content guards to Yandex as to everyone else', () => {
    const rules = rulesOf();
    const wildcard = rules.find((r) => r.userAgent === '*');
    const yandex = rules.find((r) =>
      (Array.isArray(r.userAgent) ? r.userAgent : [r.userAgent]).includes('YandexBot')
    );
    expect(yandex?.disallow).toEqual(wildcard?.disallow);
  });

  it('still points at the sitemap', () => {
    expect(robots().sitemap).toBe('https://www.lexiclash.live/sitemap.xml');
  });
});

/**
 * Yandex re-checks the verification tag periodically. If it disappears the site
 * is silently un-verified — no build error, no runtime error, we just stop being
 * able to submit sitemaps or read RU search data. Pin it in both layouts.
 */
describe('yandex-verification meta', () => {
  const YANDEX_TOKEN = 'a0492cff1a6bdd70';

  it.each([['app/layout.tsx'], ['app/[locale]/layout.tsx']])(
    'is emitted from %s',
    (relPath) => {
      const src = readFileSync(join(__dirname, '..', '..', relPath), 'utf8');
      expect(src, `${relPath} lost the yandex-verification key`).toContain(
        "'yandex-verification'"
      );
      expect(src, `${relPath} lost the issued Yandex token`).toContain(YANDEX_TOKEN);
    }
  );
});
