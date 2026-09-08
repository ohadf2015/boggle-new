import { describe, it, expect, beforeEach } from 'vitest';
import { getJoinUrl } from '@/utils/share';

describe('getJoinUrl', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://lexiclash.live', pathname: '/en/multiplayer' },
      writable: true,
    });
  });

  it('appends URL-encoded host when provided', () => {
    const url = getJoinUrl('ABC123', 'whatsapp', 'Alice');
    expect(url).toContain('host=Alice');
    expect(url).toContain('room=ABC123');
  });

  it('omits host param when undefined', () => {
    const url = getJoinUrl('ABC123', 'whatsapp');
    expect(url).not.toContain('host=');
  });

  it('encodes special characters in host name', () => {
    const url = getJoinUrl('ABC123', 'whatsapp', "Alice O'Connor");
    // Confirm round-trip via URL parsing
    const parsed = new URL(url);
    expect(parsed.searchParams.get('host')).toBe("Alice O'Connor");
  });

  it('truncates host name to 24 chars', () => {
    const longName = 'a'.repeat(40);
    const url = getJoinUrl('ABC123', 'whatsapp', longName);
    const parsed = new URL(url);
    expect(parsed.searchParams.get('host')?.length ?? 0).toBeLessThanOrEqual(24);
  });

  it('omits host param when empty string', () => {
    const url = getJoinUrl('ABC123', 'whatsapp', '');
    expect(url).not.toContain('host=');
  });
});

describe('getBragShareUrl', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://lexiclash.live', pathname: '/en/multiplayer' },
      writable: true,
    });
  });

  it('returns the brag landing URL, which carries the room code onward', async () => {
    // Was `/{locale}?room=CODE` — the homepage. A brag link has to unfurl into
    // the result image, and `og:image` is read from the metadata of whatever URL
    // is pasted; giving the homepage a per-result image would mean reading
    // searchParams in its generateMetadata, forcing dynamic rendering on the
    // app's primary SEO and LCP page. So the link points at the brag page, whose
    // CTA links straight into the room — the rematch is one tap, not zero.
    const { getBragShareUrl } = await import('@/utils/share');
    const url = getBragShareUrl('ABC123');
    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/en/brag/ABC123');
    expect(parsed.searchParams.get('utm_source')).toBe('brag_card');
  });

  it('puts the result on the link so the chat preview can render it', async () => {
    const { getBragShareUrl } = await import('@/utils/share');
    const parsed = new URL(
      getBragShareUrl('ABC123', {
        score: 142,
        rival: 118,
        name: 'Dana',
        mode: 'classic',
        words: 11,
        best: 'SPLENDID',
      })
    );
    expect(parsed.searchParams.get('score')).toBe('142');
    expect(parsed.searchParams.get('rival')).toBe('118');
    expect(parsed.searchParams.get('name')).toBe('Dana');
    expect(parsed.searchParams.get('mode')).toBe('classic');
  });

  it('rounds and floors hostile numeric input rather than passing it through', async () => {
    const { getBragShareUrl } = await import('@/utils/share');
    const parsed = new URL(
      getBragShareUrl('ABC123', { score: -5, rival: 12.7, name: 'x'.repeat(80) })
    );
    expect(parsed.searchParams.get('score')).toBe('0');
    expect(parsed.searchParams.get('rival')).toBe('13');
    expect((parsed.searchParams.get('name') ?? '').length).toBeLessThanOrEqual(24);
  });

  it('falls back to the homepage when there is no game code', async () => {
    const { getBragShareUrl } = await import('@/utils/share');
    expect(getBragShareUrl(undefined)).toBe('https://lexiclash.live');
    expect(getBragShareUrl('')).toBe('https://lexiclash.live');
  });
});
