const TITLE_RE = /<title>([^<]+)<\/title>/;
const NS_RE = /<ns>(\d+)<\/ns>/;
const TEXT_RE = /<text[^>]*>([\s\S]*?)<\/text>/;

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function extractCompoundTitlesFromPage(
  pageXml: string,
  categories: string[],
): string[] {
  const nsMatch = pageXml.match(NS_RE);
  if (nsMatch && nsMatch[1] !== '0') return [];

  const titleMatch = pageXml.match(TITLE_RE);
  if (!titleMatch) return [];
  const title = titleMatch[1].trim();
  if (!title.includes(' ')) return [];

  const textMatch = pageXml.match(TEXT_RE);
  if (!textMatch) return [];
  const body = textMatch[1];

  for (const cat of categories) {
    const re = new RegExp(`\\[\\[קטגוריה:\\s*${escapeRegex(cat)}[\\s\\]|]`);
    if (re.test(body)) return [title];
  }
  return [];
}
