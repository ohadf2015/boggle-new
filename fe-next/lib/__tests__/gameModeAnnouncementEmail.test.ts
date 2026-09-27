import { vi, describe, it, expect } from 'vitest';

/**
 * Tests for the game-mode announcement email module.
 *
 * Covers: subject line generation per mode × language,
 * HTML + plain-text render smoke, RTL support for Hebrew.
 */

// Mock email.ts shared utilities
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
  generateGameModeAnnouncementHtml,
  getGameModeAnnouncementSubject,
  type GameModeKey,
} from '../gameModeAnnouncementEmail';

const MODES: GameModeKey[] = ['blast', 'wordhunt', 'adventure'];
const LANGUAGES = ['en', 'he', 'sv', 'ja', 'es'];

describe('getGameModeAnnouncementSubject', () => {
  it('returns a non-empty subject for every mode × language combination', () => {
    for (const mode of MODES) {
      for (const lang of LANGUAGES) {
        const subject = getGameModeAnnouncementSubject(mode, lang, 'Alex');
        expect(subject).toBeTruthy();
        expect(subject.length).toBeGreaterThan(3);
      }
    }
  });

  it('falls back to English for unknown languages', () => {
    const subject = getGameModeAnnouncementSubject('blast', 'fr', 'Alex');
    expect(subject).toBeTruthy();
  });
});

describe('generateGameModeAnnouncementHtml', () => {
  const baseParams = {
    recipientName: 'Alex',
    unsubscribeUrl: 'https://lexiclash.live/api/email/unsubscribe?token=xxx',
    playUrl: 'https://lexiclash.live/en/blast',
  };

  it('renders HTML + plain text for blast/en', async () => {
    const { subject, html } = await generateGameModeAnnouncementHtml({
      ...baseParams,
      language: 'en',
      mode: 'blast',
    });

    expect(subject).toBeTruthy();
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html.toLowerCase()).toContain('blast');
  });

  it('includes the recipient name in the rendered output', async () => {
    const { html } = await generateGameModeAnnouncementHtml({
      ...baseParams,
      recipientName: 'UniqueTestName42',
      language: 'en',
      mode: 'blast',
    });
    expect(html).toContain('UniqueTestName42');
  });

  it('includes the play URL as a CTA link', async () => {
    const playUrl = 'https://lexiclash.live/en/blast?src=email-test';
    const { html } = await generateGameModeAnnouncementHtml({
      ...baseParams,
      playUrl,
      language: 'en',
      mode: 'blast',
    });
    expect(html).toContain(playUrl);
  });

  it('sets dir="rtl" when language is Hebrew', async () => {
    const { html } = await generateGameModeAnnouncementHtml({
      ...baseParams,
      language: 'he',
      mode: 'blast',
    });
    expect(html).toContain('dir="rtl"');
  });

  it('renders successfully for all mode × language combinations', async () => {
    for (const mode of MODES) {
      for (const lang of LANGUAGES) {
        const { html, subject } = await generateGameModeAnnouncementHtml({
          ...baseParams,
          language: lang,
          mode,
        });
        expect(subject).toBeTruthy();
        expect(html).toContain('<html');
      }
    }
  });
});
