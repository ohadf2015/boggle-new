/**
 * Shared Telegram sender for Next.js API routes (server-side only).
 *
 * Distinct from `backend/modules/notificationService.ts`: that module is gated
 * behind NOTIFICATIONS_ENABLED (game-event spam control). This helper is for
 * deliberate, low-volume founder-facing messages (e.g. user bug reports) and
 * gates ONLY on token + chat-id presence — never silently dropped by a feature
 * flag. Both run in different runtimes (Express vs Next route), so the escaper
 * regex below is intentionally duplicated verbatim from notificationService.ts.
 */
import logger from '@/utils/logger';

const TELEGRAM_API = 'https://api.telegram.org';

/**
 * Escape reserved characters for Telegram MarkdownV2.
 * Verbatim from backend/modules/notificationService.ts — getting this regex
 * subtly wrong corrupts every message, so do not "improve" it casually.
 */
export function escapeTelegramMarkdownV2(text?: string | null): string {
  if (!text) return '';
  return String(text).replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
}

/** True when both bot token and chat id are configured in the environment. */
export function isTelegramConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

interface SendOptions {
  /** Override the default chat id (defaults to TELEGRAM_CHAT_ID). */
  chatId?: string;
  /** Disable web-page link previews (default true). */
  disablePreview?: boolean;
}

/**
 * Send a MarkdownV2 message to Telegram. The caller is responsible for escaping
 * dynamic substrings via {@link escapeTelegramMarkdownV2}.
 *
 * Fire-and-forget friendly: never throws, returns false on any failure or when
 * unconfigured so the caller can fall back to other delivery channels.
 */
export async function sendTelegramMessage(
  text: string,
  options: SendOptions = {}
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options.chatId ?? process.env.TELEGRAM_CHAT_ID;

  if (!text || !token || !chatId) return false;

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2',
        disable_web_page_preview: options.disablePreview ?? true,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      logger.warn(`[Telegram] sendMessage failed: ${response.status} - ${errorBody}`);
      return false;
    }
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`[Telegram] sendMessage error: ${message}`);
    return false;
  }
}
