/**
 * PostHog inbox 01a0e5c7: ChunkLoadErrors split into 20+ single-event issues,
 * because minified frames and `lc_retry=` cache-bust URLs change per deploy.
 * The filter now gives each chunk id one stable fingerprint.
 */
import { filterEmptyException } from '../posthogExceptionFilter';

type Ev = { event: string; properties: Record<string, unknown> };
const exc = (type: string, value: string, extra: Record<string, unknown> = {}): Ev => ({
  event: '$exception',
  properties: { $exception_list: [{ type, value }], ...extra },
});

describe('filterEmptyException chunk-load fingerprint', () => {
  it('fingerprints webpack "Loading chunk N failed" by chunk id', () => {
    const a = filterEmptyException(
      exc('ChunkLoadError', 'Loading chunk 94991 failed.\n(error: https://www.lexiclash.live/_next/static/chunks/94991-abc.js?lc_retry=1729)'),
    ) as Ev;
    const b = filterEmptyException(
      exc('ChunkLoadError', 'Loading chunk 94991 failed.\n(error: https://www.lexiclash.live/_next/static/chunks/94991-def.js)'),
    ) as Ev;
    expect(a.properties.$exception_fingerprint).toBe('chunk-load-error:94991');
    expect(b.properties.$exception_fingerprint).toBe('chunk-load-error:94991');
  });

  it('strips lc_retry from the message so recurrences read the same', () => {
    const out = filterEmptyException(
      exc('ChunkLoadError', 'Loading chunk 14850 failed.\n(error: https://x/_next/static/chunks/14850-a.js?lc_retry=17290001)'),
    ) as Ev;
    const value = (out.properties.$exception_list as Array<{ value: string }>)[0].value;
    expect(value).not.toContain('lc_retry');
    expect(value).toContain('14850-a.js');
  });

  it('fingerprints CSS chunk failures by chunk id', () => {
    const out = filterEmptyException(exc('Error', 'Loading CSS chunk 3301 failed.\n(/_next/static/css/a.css)')) as Ev;
    expect(out.properties.$exception_fingerprint).toBe('chunk-load-error:3301');
  });

  it('groups chunk failures without a numeric id under one fingerprint', () => {
    const out = filterEmptyException(
      exc('ChunkLoadError', 'Failed to load chunk /_next/static/immutable/chunks/0x4qkpkfojkn-.js'),
    ) as Ev;
    expect(out.properties.$exception_fingerprint).toBe('chunk-load-error');
  });

  it('keeps a fingerprint the caller already set', () => {
    const out = filterEmptyException(
      exc('ChunkLoadError', 'Loading chunk 1 failed.', { $exception_fingerprint: 'custom' }),
    ) as Ev;
    expect(out.properties.$exception_fingerprint).toBe('custom');
  });

  it('leaves other errors alone', () => {
    const out = filterEmptyException(exc('TypeError', 'x is not a function')) as Ev;
    expect(out.properties.$exception_fingerprint).toBeUndefined();
  });
});
