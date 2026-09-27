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
  generateAndroidBetaLaunchHtml,
  getAndroidBetaLaunchSubject,
  PLAY_STORE_URL,
} from '../androidBetaLaunchEmail';

const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

describe('getAndroidBetaLaunchSubject', () => {
  it('returns a non-empty subject for every language', () => {
    for (const lang of LANGUAGES) {
      const subject = getAndroidBetaLaunchSubject(lang, 'Alex');
      expect(subject).toBeTruthy();
      expect(subject).toContain('Alex');
    }
  });
});

describe('generateAndroidBetaLaunchHtml (cached render)', () => {
  it('substitutes recipientName + unsubscribeUrl into cached template', async () => {
    const { html, subject } = await generateAndroidBetaLaunchHtml({
      recipientName: 'Alex',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub?t=abc',
      playUrl: PLAY_STORE_URL,
    });

    expect(subject).toContain('Alex');
    expect(html).toContain('Alex');
    expect(html).toContain('https://example.com/unsub?t=abc');
    expect(html).not.toContain('__LEXI_RECIPIENT_NAME__');
    expect(html).not.toContain('__lexi_unsubscribe_sentinel__');
  });

  it('HTML-escapes recipientName when substituting', async () => {
    const { html } = await generateAndroidBetaLaunchHtml({
      recipientName: '<script>x</script>',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });

    expect(html).not.toContain('<script>x</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('returns different recipientName values from same cached template (cache reuse)', async () => {
    const a = await generateAndroidBetaLaunchHtml({
      recipientName: 'Alice',
      language: 'sv',
      unsubscribeUrl: 'https://example.com/u/a',
      playUrl: PLAY_STORE_URL,
    });
    const b = await generateAndroidBetaLaunchHtml({
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
