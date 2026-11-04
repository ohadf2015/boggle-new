/**
 * `?_lc_chunk=` recovery reloads must NOT carry a noindex header. #1533 added
 * one; Googlebot's renderer took that reload and Google applied the noindex to
 * the clean URL, dropping 21 pages from the index (2026-10-30 to 2026-11-04).
 */

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default;
type Rule = { source: string; has?: Array<{ type: string; key: string }>; headers: Array<{ key: string; value: string }> };

describe('_lc_chunk recovery reload', () => {
  it('gets no X-Robots-Tag noindex header', async () => {
    const rules = (await (nextConfig as { headers: () => Promise<Rule[]> }).headers()) as Rule[];
    const lc = rules.filter((r) => r.has?.some((h) => h.type === 'query' && h.key === '_lc_chunk'));
    for (const r of lc) {
      for (const h of r.headers) if (h.key === 'X-Robots-Tag') expect(h.value).not.toMatch(/noindex/);
    }
  });

  it('no production rule adds noindex to every page', async () => {
    const rules = (await (nextConfig as { headers: () => Promise<Rule[]> }).headers()) as Rule[];
    for (const r of rules.filter((x) => !x.has)) {
      for (const h of r.headers) if (h.key === 'X-Robots-Tag') expect(h.value).not.toMatch(/^noindex, follow$/);
    }
  });
});
