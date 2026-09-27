import { stripEmoji } from '@/lib/share/stripEmoji';

export type ShareResult = 'shared' | 'copied' | 'cancelled' | 'failed';

export interface ShareWithFallbackOptions {
  title?: string;
  text: string;
  url?: string;
  clipboardText?: string;
}

export async function shareWithFallback(
  opts: ShareWithFallbackOptions,
): Promise<ShareResult> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const title = opts.title === undefined ? undefined : stripEmoji(opts.title);
  const text = stripEmoji(opts.text);

  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title, text, url: opts.url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  const clipboardText = stripEmoji(
    opts.clipboardText ?? (opts.url ? `${opts.text}${opts.url}` : opts.text),
  );

  try {
    await nav?.clipboard?.writeText(clipboardText);
    return 'copied';
  } catch {
    return 'failed';
  }
}
