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

  it('renders feature chips as SOLID neo tags (filled bg + black border), not thin outlines', async () => {
    const { html } = await generateAndroidReleaseLaunchHtml({
      recipientName: 'Alex',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });
    const lower = html.toLowerCase();
    // The OLD hollow-outline chip signature (thin colored border, no fill) must be gone.
    expect(lower).not.toContain('border:2px solid #00ffff');
    expect(lower).not.toContain('border:2px solid #ff1493');
    // A filled neo chip = colored fill + hard BLACK border in the SAME style attr.
    // The rainbow strip uses these fills too, but has no black border — so this
    // co-occurrence regex can only match the redesigned chips.
    expect(lower).toMatch(/background-color:#ff1493;[^"]*3px solid #000000/);
    expect(lower).toMatch(/background-color:#00ffff;[^"]*3px solid #000000/);
  });

  it('does NOT render the bare colored play emoji in the CTA', async () => {
    const { html } = await generateAndroidReleaseLaunchHtml({
      recipientName: 'Alex',
      language: 'en',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });
    expect(html).not.toContain('▶'); // ▶ renders as an off-brand color emoji
    expect(html).toContain('/email-assets/android-release-play-icon.png');
  });

  it('flips hard shadows for Hebrew RTL (negative x-offset)', async () => {
    const { html } = await generateAndroidReleaseLaunchHtml({
      recipientName: 'דנה',
      language: 'he',
      unsubscribeUrl: 'https://example.com/unsub',
      playUrl: PLAY_STORE_URL,
    });
    expect(html.toLowerCase()).toContain('-8px 8px 0px #000000');
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
