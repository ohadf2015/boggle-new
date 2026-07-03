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

  it('returns a live room join link when the room is still open', async () => {
    const { getBragShareUrl } = await import('@/utils/share');
    const url = getBragShareUrl('ABC123');
    const parsed = new URL(url);
    expect(parsed.searchParams.get('room')).toBe('ABC123');
    expect(parsed.searchParams.get('utm_source')).toBe('brag_card');
  });

  it('falls back to the homepage when there is no game code', async () => {
    const { getBragShareUrl } = await import('@/utils/share');
    expect(getBragShareUrl(undefined)).toBe('https://lexiclash.live');
    expect(getBragShareUrl('')).toBe('https://lexiclash.live');
  });
});
