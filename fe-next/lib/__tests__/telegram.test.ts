import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Tests for lib/telegram.ts — shared Telegram sender used by API routes
 * (e.g. /api/feedback). Distinct from backend/notificationService which is
 * gated behind NOTIFICATIONS_ENABLED; this helper only needs token + chat id.
 */

vi.mock('@/utils/logger', () => ({
  default: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const ORIGINAL_ENV = { ...process.env };

describe('lib/telegram', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  describe('escapeTelegramMarkdownV2', () => {
    it('escapes MarkdownV2 reserved characters', async () => {
      const { escapeTelegramMarkdownV2 } = await import('../telegram');
      expect(escapeTelegramMarkdownV2('a_b*c[d]')).toBe('a\\_b\\*c\\[d\\]');
      expect(escapeTelegramMarkdownV2('hello.world!')).toBe('hello\\.world\\!');
      expect(escapeTelegramMarkdownV2('(x)~`>#+=|{}-')).toBe(
        '\\(x\\)\\~\\`\\>\\#\\+\\=\\|\\{\\}\\-'
      );
    });

    it('returns empty string for undefined/null', async () => {
      const { escapeTelegramMarkdownV2 } = await import('../telegram');
      expect(escapeTelegramMarkdownV2(undefined)).toBe('');
      expect(escapeTelegramMarkdownV2('')).toBe('');
    });
  });

  describe('isTelegramConfigured', () => {
    it('is false when token or chat id missing', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
      const { isTelegramConfigured } = await import('../telegram');
      expect(isTelegramConfigured()).toBe(false);
    });

    it('is true when both present', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'tok';
      process.env.TELEGRAM_CHAT_ID = '123';
      const { isTelegramConfigured } = await import('../telegram');
      expect(isTelegramConfigured()).toBe(true);
    });
  });

  describe('sendTelegramMessage', () => {
    it('returns false and does not fetch when unconfigured', async () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;
      const fetchSpy = vi.fn();
      vi.stubGlobal('fetch', fetchSpy);
      const { sendTelegramMessage } = await import('../telegram');
      const ok = await sendTelegramMessage('hi');
      expect(ok).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('POSTs to the Telegram API with MarkdownV2 and returns true on ok', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'tok123';
      process.env.TELEGRAM_CHAT_ID = '476180624';
      const fetchSpy = vi.fn().mockResolvedValue({ ok: true, text: async () => '' });
      vi.stubGlobal('fetch', fetchSpy);

      const { sendTelegramMessage } = await import('../telegram');
      const ok = await sendTelegramMessage('*hello*');

      expect(ok).toBe(true);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, init] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://api.telegram.org/bottok123/sendMessage');
      expect(init.method).toBe('POST');
      const body = JSON.parse(init.body);
      expect(body.chat_id).toBe('476180624');
      expect(body.text).toBe('*hello*');
      expect(body.parse_mode).toBe('MarkdownV2');
    });

    it('returns false on non-ok response without throwing', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'tok';
      process.env.TELEGRAM_CHAT_ID = '123';
      const fetchSpy = vi
        .fn()
        .mockResolvedValue({ ok: false, status: 400, text: async () => 'bad' });
      vi.stubGlobal('fetch', fetchSpy);
      const { sendTelegramMessage } = await import('../telegram');
      await expect(sendTelegramMessage('x')).resolves.toBe(false);
    });

    it('returns false on network error without throwing', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'tok';
      process.env.TELEGRAM_CHAT_ID = '123';
      const fetchSpy = vi.fn().mockRejectedValue(new Error('boom'));
      vi.stubGlobal('fetch', fetchSpy);
      const { sendTelegramMessage } = await import('../telegram');
      await expect(sendTelegramMessage('x')).resolves.toBe(false);
    });
  });
});
