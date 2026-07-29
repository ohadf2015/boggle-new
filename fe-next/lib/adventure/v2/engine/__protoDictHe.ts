// PROTOTYPE Hebrew dictionary — populated at runtime from /adventure-v2/he-dict.txt
// (sourced from backend/hebrew_words.txt, filtered to 3-7 char words, base-form only).
// Replaced in Plan 2 with full LexiClash dictionary infra.

import { __resetBotDictCache } from './botWordPicker';

export const PROTO_DICT_HE: Set<string> = new Set();

let dictPromise: Promise<void> | null = null;

export function isHeDictLoaded(): boolean {
  return PROTO_DICT_HE.size > 0;
}

export async function loadHeDict(): Promise<void> {
  if (isHeDictLoaded()) return;
  if (dictPromise) return dictPromise;

  dictPromise = (async () => {
    const resp = await fetch('/adventure-v2/he-dict.txt');
    if (!resp.ok) throw new Error(`Failed to load HE dict: ${resp.status}`);
    const text = await resp.text();
    let added = 0;
    for (const line of text.split('\n')) {
      const w = line.trim();
      if (w.length >= 3 && w.length <= 7) {
        PROTO_DICT_HE.add(w);
        added++;
      }
    }
    __resetBotDictCache();
    if (typeof console !== 'undefined') {
      console.info(`[adventure-v2] HE dict loaded: ${added} words`);
    }
  })();

  return dictPromise;
}
