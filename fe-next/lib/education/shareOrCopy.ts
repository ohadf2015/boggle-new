export type ShareOutcome = 'native' | 'copy' | 'cancelled' | 'failed';

/** Share sheet first, clipboard when there is none or it refuses (iOS drops the tap's activation after an await). */
export async function shareOrCopy(data: { title?: string; text?: string; url: string }): Promise<ShareOutcome> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(data);
      return 'native';
    } catch (err) {
      if ((err as { name?: string } | null)?.name === 'AbortError') return 'cancelled';
    }
  }
  try {
    await navigator.clipboard.writeText(data.text ? `${data.text} ${data.url}` : data.url);
    return 'copy';
  } catch {
    return 'failed';
  }
}
