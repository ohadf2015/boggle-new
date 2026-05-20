import { vi, describe, it, expect } from 'vitest';

vi.mock('@/lib/email', () => ({
  getSupabaseAdmin: vi.fn(() => null),
  withTimeout: vi.fn((p: Promise<unknown>) => p),
  generateUnsubscribeToken: vi.fn(() => 'mock-token-123'),
  isEmailServiceConfigured: vi.fn(() => true),
}));

vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi.fn().mockResolvedValue({ data: { id: 'mock-id' }, error: null }),
    },
  })),
}));

import {
  generateAndroidReleaseLaunchHtml,
  getAndroidReleaseLaunchSubject,
  HERO_IMAGE,
  PLAY_STORE_URL,
} from '../androidReleaseLaunchEmail';

const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

describe('getAndroidReleaseLaunchSubject', () => {
  it('returns a non-empty subject containing the recipient name for every language', () => {
    for (const lang of LANGUAGES) {
      const subject = getAndroidReleaseLaunchSubject(lang, 'Alex');
      expect(subject).toBeTruthy();
      expect(subject).toContain('Alex');
    }
  });

  it('falls back to English for an unknown language', () => {
    const en = getAndroidReleaseLaunchSubject('en', 'Alex');
    const unknown = getAndroidReleaseLaunchSubject('xx-XX', 'Alex');
    expect(unknown).toBe(en);
  });
});

describe('generateAndroidReleaseLaunchHtml (cached render)', () => {
  it('substitutes recipientName + unsubscribeUrl into cached template', async () => {
    const { html, subject } = await generateAndroidReleaseLaunchHtml({
      recipientName: 'Alex',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub?t=abc',
      playUrl: PLAY_STORE_URL,
    });

    expect(subject).toContain('Alex');
    expect(html).toContain('Alex');
    expect(html).toContain('https://example.com/unsub?t=abc');
    expect(html).toContain(PLAY_STORE_URL);
    expect(html).toContain(HERO_IMAGE);
    expect(html).not.toContain('__LEXI_RECIPIENT_NAME__');
    expect(html).not.toContain('__lexi_unsubscribe_sentinel__');
  });

  it('produces a REAL email — never the [TEST] subject prefix', async () => {
    const { html, subject } = await generateAndroidReleaseLaunchHtml({
      recipientName: 'Alex',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });
    expect(subject).not.toContain('[TEST]');
    expect(html).not.toContain('[TEST]');
  });

  it('HTML-escapes recipientName when substituting', async () => {
    const { html } = await generateAndroidReleaseLaunchHtml({
      recipientName: '<script>x</script>',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });

    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('renders Hebrew right-to-left', async () => {
    const { html } = await generateAndroidReleaseLaunchHtml({
      recipientName: 'דנה',
      language: 'he',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });
    expect(html).toContain('dir="rtl"');
  });

  it('reuses the same cached template across recipients without leaking names', async () => {
    const a = await generateAndroidReleaseLaunchHtml({
      recipientName: 'Alice',
      language: 'sv',
      unsubscribeUrl: 'https://example.com/u/a',
      playUrl: PLAY_STORE_URL,
    });
    const b = await generateAndroidReleaseLaunchHtml({
      recipientName: 'Bob',
      language: 'sv',
      unsubscribeUrl: 'https://example.com/u/b',
      playUrl: PLAY_STORE_URL,
    });

    expect(a.html).toContain('Alice');
    expect(a.html).toContain('https://example.com/u/a');
    expect(b.html).toContain('Bob');
    expect(b.html).toContain('https://example.com/u/b');
    expect(a.html).not.toContain('Bob');
    expect(b.html).not.toContain('Alice');
  });
});
