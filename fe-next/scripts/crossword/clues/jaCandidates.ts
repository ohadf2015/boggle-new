// ja crossword answer candidates: 3-4 hiragana from the curated list that the shipped dictionary also accepts.
const HIRAGANA = /^[ぁ-ゖー]{3,4}$/;
const FRAGMENT_EDGE = /^[ぁぃぅぇぉっゃゅょゎゕゖー]|[ぁぃぅぇぉっゃゅょゎゕゖ]$/;

export function selectJaCandidates(lines: string[], dict: Set<string>): string[] {
  const out = new Set<string>();
  for (const raw of lines) {
    const w = raw.trim();
    if (HIRAGANA.test(w) && !FRAGMENT_EDGE.test(w) && dict.has(w)) out.add(w);
  }
  return [...out];
}
