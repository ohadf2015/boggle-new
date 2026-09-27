export interface FetchCategoryOptions {
  fetcher?: typeof fetch;
  limit?: number;
  userAgent?: string;
}

interface ApiMember { ns: number; title: string }
interface ApiResponse {
  query?: { categorymembers?: ApiMember[] };
  continue?: { cmcontinue?: string };
}

async function fetchCategoryMembersByNs(
  host: string,
  category: string,
  ns: number,
  cmtype: 'page' | 'subcat',
  opts: FetchCategoryOptions,
): Promise<string[]> {
  const fetcher = opts.fetcher ?? fetch;
  const limit = opts.limit ?? 500;
  const headers: Record<string, string> = {
    'user-agent': opts.userAgent ?? 'LexiClash-Connections-Generator/1.0 (https://lexiclash.app)',
  };

  const titles: string[] = [];
  let cmcontinue: string | undefined;

  while (true) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'categorymembers',
      cmtitle: category,
      cmtype,
      cmlimit: String(limit),
      format: 'json',
      formatversion: '2',
    });
    if (cmcontinue) params.set('cmcontinue', cmcontinue);

    const url = `https://${host}/w/api.php?${params.toString()}`;
    const res = await fetcher(url, { headers });
    if (!res.ok) {
      throw new Error(`MediaWiki API error ${res.status} for ${url}`);
    }
    const json = (await res.json()) as ApiResponse;
    const members = json.query?.categorymembers ?? [];
    for (const m of members) {
      if (m.ns === ns) titles.push(m.title);
    }
    cmcontinue = json.continue?.cmcontinue;
    if (!cmcontinue) break;
  }

  return titles;
}

export function fetchCategoryMembers(
  host: string,
  category: string,
  opts: FetchCategoryOptions = {},
): Promise<string[]> {
  return fetchCategoryMembersByNs(host, category, 0, 'page', opts);
}

export function fetchSubcategories(
  host: string,
  category: string,
  opts: FetchCategoryOptions = {},
): Promise<string[]> {
  return fetchCategoryMembersByNs(host, category, 14, 'subcat', opts);
}

export interface WalkCategoryTreeOptions extends FetchCategoryOptions {
  maxDepth: number;
  maxCategories?: number;
  skipOnError?: boolean;
}

export async function walkCategoryTree(
  host: string,
  root: string,
  opts: WalkCategoryTreeOptions,
): Promise<string[]> {
  const { maxDepth, maxCategories = Infinity, skipOnError = false } = opts;

  const seenCats = new Set<string>([root]);
  const seenTitles = new Set<string>();
  const titles: string[] = [];
  const queue: { cat: string; depth: number }[] = [{ cat: root, depth: 0 }];
  let subcatFetchCount = 0;

  while (queue.length) {
    const { cat, depth } = queue.shift()!;

    try {
      const pages = await fetchCategoryMembers(host, cat, opts);
      for (const t of pages) {
        if (seenTitles.has(t)) continue;
        seenTitles.add(t);
        titles.push(t);
      }
    } catch (e) {
      if (!skipOnError) throw e;
      console.error(`[walkCategoryTree] pages ${cat}: ${(e as Error).message}`);
      continue;
    }

    if (depth >= maxDepth) continue;
    if (subcatFetchCount >= maxCategories) continue;

    try {
      subcatFetchCount++;
      const subs = await fetchSubcategories(host, cat, opts);
      for (const sub of subs) {
        if (seenCats.has(sub)) continue;
        seenCats.add(sub);
        queue.push({ cat: sub, depth: depth + 1 });
      }
    } catch (e) {
      if (!skipOnError) throw e;
      console.error(`[walkCategoryTree] subcats ${cat}: ${(e as Error).message}`);
    }
  }

  return titles;
}

export interface FetchManyCategoriesOptions extends FetchCategoryOptions {
  /** If true, swallow per-category errors and move on; otherwise rethrow. */
  skipOnError?: boolean;
}

export async function fetchCategoryMembersMany(
  host: string,
  categories: string[],
  opts: FetchManyCategoriesOptions = {},
): Promise<string[]> {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const cat of categories) {
    try {
      const titles = await fetchCategoryMembers(host, cat, opts);
      for (const t of titles) {
        if (seen.has(t)) continue;
        seen.add(t);
        out.push(t);
      }
    } catch (e) {
      if (!opts.skipOnError) throw e;
      console.error(`[fetchCategoryMembersMany] skipping ${cat}: ${(e as Error).message}`);
    }
  }
  return out;
}

export interface FetchAllPagesOptions {
  fetcher?: typeof fetch;
  limit?: number;
  maxPages?: number;
  userAgent?: string;
  /** Start walking from this title (inclusive). Use to jump past alphabetical ranges you don't want. */
  from?: string;
}

interface AllPagesResponse {
  query?: { allpages?: ApiMember[] };
  continue?: { apcontinue?: string };
}

export async function fetchAllPageTitles(
  host: string,
  opts: FetchAllPagesOptions = {},
): Promise<string[]> {
  const fetcher = opts.fetcher ?? fetch;
  const limit = opts.limit ?? 500;
  const maxPages = opts.maxPages ?? Infinity;
  const headers: Record<string, string> = {
    'user-agent': opts.userAgent ?? 'LexiClash-Connections-Generator/1.0 (https://lexiclash.app)',
  };

  const titles: string[] = [];
  let apcontinue: string | undefined;
  let pageCount = 0;

  while (pageCount < maxPages) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'allpages',
      apnamespace: '0',
      aplimit: String(limit),
      format: 'json',
      formatversion: '2',
    });
    if (apcontinue) params.set('apcontinue', apcontinue);
    else if (opts.from) params.set('apfrom', opts.from);

    const url = `https://${host}/w/api.php?${params.toString()}`;
    const res = await fetcher(url, { headers });
    if (!res.ok) {
      throw new Error(`MediaWiki API error ${res.status} for ${url}`);
    }
    const json = (await res.json()) as AllPagesResponse;
    const pages = json.query?.allpages ?? [];
    for (const m of pages) {
      if (m.ns === 0) titles.push(m.title);
    }
    apcontinue = json.continue?.apcontinue;
    pageCount++;
    if (!apcontinue) break;
  }

  return titles;
}
