/**
 * Shared "share a WordCraft duel" plumbing. The build-the-link + native-share-
 * or-clipboard dance was copy-pasted across three surfaces (the game-over
 * challenge control, the duel re-challenge result, and the in-game invite
 * strip). One helper keeps them identical so a fix lands everywhere at once.
 */
import { buildDuelUrl, type Duel } from './duel';

export interface DuelShareData {
  title: string;
  text: string;
  url: string;
}

/** Build the {title, text, url} payload for a duel share from its parts. */
export function buildDuelShareData(
  origin: string,
  locale: string,
  duel: Duel,
  shareText: string,
  shareTitle: string,
): DuelShareData {
  return { title: shareTitle, text: shareText, url: buildDuelUrl(origin, locale, duel) };
}

export interface DuelShareCallbacks {
  /** Clipboard fallback succeeded — surface a "link copied" toast. */
  onCopied: () => void;
  /** Clipboard write rejected (perms / insecure context) — surface an error. */
  onCopyFailed: () => void;
}

/**
 * Share a duel: native share sheet when available, otherwise copy the link to
 * the clipboard. A user-cancelled native share (AbortError) is silent — it's
 * intentional, not a failure. Any other native-share error falls back to the
 * clipboard so the invite is never a silent no-op.
 */
export async function performDuelShare(
  data: DuelShareData,
  { onCopied, onCopyFailed }: DuelShareCallbacks,
): Promise<void> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title: data.title, text: data.text, url: data.url });
      return;
    } catch (err: unknown) {
      // User cancelled — normal, don't fall back or toast.
      if (err instanceof Error && err.name === 'AbortError') return;
      // Any other failure: fall through to the clipboard path below.
    }
  }

  try {
    await navigator.clipboard.writeText(data.url);
    onCopied();
  } catch {
    onCopyFailed();
  }
}
