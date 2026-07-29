/**
 * Word solver client — calls the /api/word-solver endpoint
 * which has access to full dictionaries for all languages.
 */

export async function findWordsApi(
  letters: string,
  language: string
): Promise<{ words: string[]; total: number; capped: boolean }> {
  const res = await fetch('/api/word-solver', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ letters, language }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

/** Group words by length, returning entries sorted by length descending */
export function groupByLength(words: string[]): [number, string[]][] {
  const groups: Record<number, string[]> = {};
  for (const word of words) {
    const len = word.length;
    if (!groups[len]) groups[len] = [];
    groups[len].push(word);
  }
  return Object.entries(groups)
    .map(([len, ws]) => [Number(len), ws] as [number, string[]])
    .sort((a, b) => b[0] - a[0]);
}
