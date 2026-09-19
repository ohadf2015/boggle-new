'use client';

import { useCallback, useEffect, useState } from 'react';
import { type RivalTower, decodeRival, encodeRival } from '@/lib/wordTowerV2/wreck';

/**
 * Friend-vs-friend without a backend: your tower travels IN the link. Opening
 * `?rival=` loads their words; after your run you smash that tower, then send
 * yours back the same way.
 */
export function useRivalTower(language: string) {
  const [rival, setRival] = useState<RivalTower | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('rival');
    if (param) setRival(decodeRival(param));
  }, []);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1800);
    return () => window.clearTimeout(id);
  }, [copied]);

  const share = useCallback(
    async ({ name, words, text }: RivalTower & { text: string }) => {
      const url = `${window.location.origin}/${language}/word-tower-v2?rival=${encodeRival({ name, words })}`;
      try {
        if (typeof navigator.share === 'function') {
          await navigator.share({ text, url });
          return;
        }
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
      } catch {
        // User dismissed the share sheet, or clipboard is blocked: nothing to undo.
      }
    },
    [language],
  );

  return { rival, share, copied };
}
