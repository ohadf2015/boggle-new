import { gunzipSync, gzipSync } from 'node:zlib';

function normalize(word: string): string {
  return word.trim().toLocaleLowerCase();
}

export function buildDictBlob(words: string[]): Buffer {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const raw of words) {
    const w = normalize(raw);
    if (!w) continue;
    if (seen.has(w)) continue;
    seen.add(w);
    ordered.push(w);
  }
  return gzipSync(Buffer.from(ordered.join('\n'), 'utf8'));
}

export function parseDictBlob(blob: Buffer | Uint8Array): string[] {
  const text = gunzipSync(Buffer.from(blob)).toString('utf8');
  return text.split('\n').map((w) => w.trim()).filter((w) => w.length > 0);
}
