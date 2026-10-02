export interface HelpSearchEntry {
  slug: string;
  title: string;
  summary: string;
  keywords: string;
  category: string;
  kind: 'article' | 'tutorial';
}

function score(entry: HelpSearchEntry, term: string): number {
  if (entry.title.toLowerCase().includes(term)) return 3;
  if (entry.keywords.toLowerCase().includes(term)) return 2;
  if (entry.summary.toLowerCase().includes(term) || entry.category.toLowerCase().includes(term)) return 1;
  return 0;
}

/** Substring match on every word, so Japanese (no spaces) and partial words both work. */
export function searchHelp(index: HelpSearchEntry[], query: string, limit = 8): HelpSearchEntry[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index
    .map((entry) => {
      const scores = terms.map((t) => score(entry, t));
      return { entry, total: scores.includes(0) ? 0 : scores.reduce((a, b) => a + b, 0) };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, limit)
    .map((r) => r.entry);
}
