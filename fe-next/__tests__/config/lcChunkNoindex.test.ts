/**
 * `?_lc_chunk=` recovery reloads must not be indexable (Bing indexed them),
 * and only those requests get the noindex header.
 */
import { vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  withSentryConfig: (config: unknown) => config,
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

const nextConfig = (await import('../../next.config.mjs')).default;
type Rule = { source: string; has?: Array<{ type: string; key: string }>; headers: Array<{ key: string; value: string }> };

describe('_lc_chunk noindex header', () => {
  it('sends X-Robots-Tag noindex,follow only when the _lc_chunk query is present', async () => {
    const rules = (await (nextConfig as { headers: () => Promise<Rule[]> }).headers()) as Rule[];
    const lc = rules.filter((r) => r.has?.some((h) => h.type === 'query' && h.key === '_lc_chunk'));
    expect(lc).toHaveLength(1);
    expect(lc[0].source).toBe('/:path*');
    expect(lc[0].headers).toEqual([{ key: 'X-Robots-Tag', value: 'noindex, follow' }]);
    // No unconditional rule adds noindex in production.
    for (const r of rules.filter((x) => !x.has)) {
      for (const h of r.headers) if (h.key === 'X-Robots-Tag') expect(h.value).not.toMatch(/^noindex, follow$/);
    }
  });
});
