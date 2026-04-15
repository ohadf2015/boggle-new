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

  if (nav && typeof nav.share === 'function') {
    try {
      await nav.share({ title: opts.title, text: opts.text, url: opts.url });
      return 'shared';
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'cancelled';
      }
    }
  }

  const clipboardText =
    opts.clipboardText ?? (opts.url ? `${opts.text}${opts.url}` : opts.text);

  try {
    await nav?.clipboard?.writeText(clipboardText);
    return 'copied';
  } catch {
    return 'failed';
  }
}
