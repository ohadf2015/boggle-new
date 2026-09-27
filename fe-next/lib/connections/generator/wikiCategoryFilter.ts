export interface FetchPageCategoriesOptions {
  fetcher?: typeof fetch;
  userAgent?: string;
  batchSize?: number;
  cllimit?: number;
}

interface ApiCategory { ns: number; title: string }
interface ApiPage { title: string; categories?: ApiCategory[] }
interface ApiResponse {
  query?: { pages?: ApiPage[] };
  continue?: { clcontinue?: string };
}

const CATEGORY_NS_PREFIXES = [/^קטגוריה:/, /^Category:/];
const stripNs = (t: string): string => {
  for (const re of CATEGORY_NS_PREFIXES) if (re.test(t)) return t.replace(re, '');
  return t;
};

export async function fetchPageCategories(
  host: string,
  titles: string[],
  opts: FetchPageCategoriesOptions = {},
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (titles.length === 0) return out;

  const fetcher = opts.fetcher ?? fetch;
  const batchSize = opts.batchSize ?? 50;
  const cllimit = opts.cllimit ?? 500;
  const headers: Record<string, string> = {
    'user-agent':
      opts.userAgent ?? 'LexiClash-Connections-Generator/1.0 (https://lexiclash.app)',
  };

  for (let i = 0; i < titles.length; i += batchSize) {
    const batch = titles.slice(i, i + batchSize);
    let clcontinue: string | undefined;

    while (true) {
      const params = new URLSearchParams({
        action: 'query',
        prop: 'categories',
        titles: batch.join('|'),
        cllimit: String(cllimit),
        clshow: '!hidden',
        format: 'json',
        formatversion: '2',
      });
      if (clcontinue) params.set('clcontinue', clcontinue);

      const url = `https://${host}/w/api.php?${params.toString()}`;
      const res = await fetcher(url, { headers });
      if (!res.ok) {
        throw new Error(`MediaWiki API error ${res.status} for ${url}`);
      }
      const json = (await res.json()) as ApiResponse;
      const pages = json.query?.pages ?? [];
      for (const p of pages) {
        const cats = (p.categories ?? []).map((c) => stripNs(c.title));
        if (!cats.length) continue;
        const existing = out.get(p.title);
        if (existing) existing.push(...cats);
        else out.set(p.title, cats);
      }
      clcontinue = json.continue?.clcontinue;
      if (!clcontinue) break;
    }
  }

  return out;
}

// Reject-patterns for Hebrew Wikipedia categories that reliably indicate
// biographies, places, awards, works-of-art, or organizations — article types
// whose titles never form real lexicalized Hebrew compound terms.
export const HE_REJECT_CATEGORY_PATTERNS: RegExp[] = [
  // Biographical
  /^אישי/, /^אישים/, /^ילידי/, /נפטרו/, /^רבני/, /^רבנים/,
  /^סופרי/, /^משוררי/, /^שחקני/, /^זמרי/, /^מלחיני/, /^מוזיקאי/,
  /^מדעני/, /^פיזיקאי/, /^מתמטיקאי/, /^פוליטיקאי/, /^נשיאי/,
  /^ראשי ממשלה/, /^חברי כנסת/, /^עיתונאי/, /^במאי/, /^שחקניות/,
  // Places
  /^ער[יה] /, /^יישוב/, /^כפרי/, /^שכונ/, /^מדינות/, /^ארצות/,
  /^רחובות/, /^גבעות/, /^הרי/, /^נהרות/, /^אגמי/,
  // Works of art
  /^סרטים/, /^סדרות/, /^רומנים/, /^אלבומי/, /^סינגלי/, /^שירים/,
  /^להקות/, /^ספרי/,
  // Awards
  /^זוכי פרס/, /^פרס /, /^פרסים/, /^חתני/,
  // Organizations / history / military
  /^חברות/, /^מותגי/, /^תאגידים/, /^ארגוני/,
  /^קרבות/, /^מלחמות/, /^מבצעים/,
];

export function hasRejectedCategory(
  cats: string[],
  patterns: RegExp[] = HE_REJECT_CATEGORY_PATTERNS,
): boolean {
  return cats.some((c) => patterns.some((p) => p.test(c)));
}
