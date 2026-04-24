#!/usr/bin/env tsx
import { parseArgs } from 'node:util';
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fetchCategoryMembersMany, walkCategoryTree } from '../../lib/connections/generator/wiktionaryApi';
import { buildTriplesFromCompounds } from '../../lib/connections/generator/tripleBuilder';
import { renderPuzzleFile } from '../../lib/connections/generator/puzzleWriter';
import { fetchPhraseTotalHits, makeCachedFreqLookup } from '../../lib/connections/generator/frequencyApi';
import { validateTripleAsync } from '../../lib/connections/generator/validator';
import {
  fetchPageCategories,
  hasRejectedCategory,
  HE_REJECT_CATEGORY_PATTERNS,
} from '../../lib/connections/generator/wikiCategoryFilter';
import type { Difficulty } from '../../lib/connections/types';

interface LocaleConfig {
  host: string;
  exportName: string;
  idPrefix: string;
  scriptPattern: RegExp;
  categories: string[];
}

// Curated topical categories — picked for dense compound-term naming.
// Both sides of a triple must form a real multi-word term, not a proper noun
// or descriptive adj+noun. Topical leaf categories (foods, instruments, sport)
// satisfy this far better than list=allpages (which is dominated by biographies
// near alphabetical prefixes).
const LOCALES: Record<'he' | 'en', LocaleConfig> = {
  he: {
    host: 'he.wikipedia.org',
    exportName: 'HE_GENERATED',
    idPrefix: 'he-g',
    scriptPattern: /^[א-ת]+$/,
    categories: [
      'קטגוריה:מאכלים',
      'קטגוריה:כלי נגינה',
      'קטגוריה:ספורט',
      'קטגוריה:צמחים',
      'קטגוריה:ספרים',
      'קטגוריה:דגים',
      'קטגוריה:עופות',
      'קטגוריה:יונקים',
      'קטגוריה:זוחלים',
      'קטגוריה:חרקים',
      'קטגוריה:מדעים',
      'קטגוריה:מתמטיקה',
      'קטגוריה:פיזיקה',
      'קטגוריה:כימיה',
      'קטגוריה:ביולוגיה',
      'קטגוריה:רפואה',
      'קטגוריה:אנטומיה',
      'קטגוריה:מחלות',
      'קטגוריה:טכנולוגיה',
      'קטגוריה:מחשבים',
      'קטגוריה:רכיבי מחשב',
      'קטגוריה:כלי רכב',
      'קטגוריה:כלי טיס',
      'קטגוריה:כלי שיט',
      'קטגוריה:רכבת',
      'קטגוריה:בנייה',
      'קטגוריה:אדריכלות',
      'קטגוריה:מבנים',
      'קטגוריה:רהיטים',
      'קטגוריה:ביגוד',
      'קטגוריה:אופנה',
      'קטגוריה:תכשיטים',
      'קטגוריה:כלי עבודה',
      'קטגוריה:נשק',
      'קטגוריה:משחקים',
      'קטגוריה:צבא',
      'קטגוריה:מוזיקה',
      'קטגוריה:סרטים',
      'קטגוריה:טלוויזיה',
      'קטגוריה:אמנות',
      'קטגוריה:ציור',
      'קטגוריה:ריקוד',
      'קטגוריה:תיאטרון',
      'קטגוריה:משפט',
      'קטגוריה:כלכלה',
      'קטגוריה:פוליטיקה',
      'קטגוריה:דת',
      'קטגוריה:יהדות',
      'קטגוריה:פילוסופיה',
      'קטגוריה:פסיכולוגיה',
      'קטגוריה:לשון',
      'קטגוריה:דקדוק',
      'קטגוריה:אסטרונומיה',
      'קטגוריה:מטאורולוגיה',
      'קטגוריה:גאוגרפיה',
      'קטגוריה:גאולוגיה',
    ],
  },
  en: {
    host: 'en.wikipedia.org',
    exportName: 'EN_GENERATED',
    idPrefix: 'en-g',
    scriptPattern: /^[A-Za-z]+$/,
    categories: [
      'Category:Breads',
      'Category:Soups',
      'Category:Salads',
      'Category:Sandwiches',
      'Category:Pasta',
      'Category:Cheeses',
      'Category:Cakes',
      'Category:Cookies',
    ],
  },
};

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      locale: { type: 'string', default: 'he' },
      tier: { type: 'string', default: 'hard' },
      n: { type: 'string', default: '100' },
      categories: { type: 'string' },
      out: { type: 'string' },
      depth: { type: 'string', default: '0' },
      'min-freq': { type: 'string', default: '0' },
      'max-categories': { type: 'string', default: '300' },
    },
  });

  const locale = (values.locale ?? 'he') as 'he' | 'en';
  const tier = (values.tier ?? 'hard') as Difficulty;
  const n = Number.parseInt(String(values.n ?? '100'), 10);
  const depth = Number.parseInt(String(values.depth ?? '0'), 10);
  const minFreq = Number.parseInt(String(values['min-freq'] ?? '0'), 10);
  const maxCategories = Number.parseInt(String(values['max-categories'] ?? '300'), 10);
  const cfg = LOCALES[locale];
  if (!cfg) throw new Error(`Unsupported locale: ${locale}`);

  const categories = values.categories
    ? String(values.categories).split(',').map((c) => c.trim()).filter(Boolean)
    : cfg.categories;

  const outPath = values.out
    ? resolve(String(values.out))
    : resolve(process.cwd(), `lib/connections/puzzles/generated/${locale}-${tier}.generated.ts`);

  console.error(`[generate-puzzles] locale=${locale} tier=${tier} n=${n} depth=${depth} minFreq=${minFreq}`);
  console.error(`[generate-puzzles] ${categories.length} seed categories on ${cfg.host}`);

  let titles: string[];
  if (depth > 0) {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const root of categories) {
      try {
        const walked = await walkCategoryTree(cfg.host, root, {
          maxDepth: depth,
          maxCategories,
          skipOnError: true,
        });
        for (const t of walked) {
          if (seen.has(t)) continue;
          seen.add(t);
          out.push(t);
        }
        console.error(`[generate-puzzles] walked ${root} → ${walked.length} titles (running total ${out.length})`);
      } catch (e) {
        console.error(`[generate-puzzles] walk failed ${root}: ${(e as Error).message}`);
      }
    }
    titles = out;
  } else {
    titles = await fetchCategoryMembersMany(cfg.host, categories, { skipOnError: true });
  }
  console.error(`[generate-puzzles] ${titles.length} article titles (deduped)`);

  const rawCompounds = titles.filter((t) => {
    if (/[()\[\].,:;"'\d]/.test(t)) return false;
    const parts = t.split(/\s+/);
    if (parts.length !== 2) return false;
    if (!parts.every((p) => p.length >= 3)) return false;
    return parts.every((p) => cfg.scriptPattern.test(p));
  });

  // Hebrew weak-token gates: clitic prefix and proper-noun blocklist.
  // A token like הדרך ("the road") or לבשר ("to flesh") starts with a
  // single-char clitic glued to a known root noun — fine in running prose
  // but breaks bare-noun pivots in a Connections puzzle.
  const HE_CLITICS = new Set(['ה', 'ו', 'ש', 'ב', 'ל', 'מ', 'כ']);
  const HE_PROPER_BLOCKLIST = new Set([
    // Common first names (homonyms with verbs/nouns cause bad pivots)
    'מרים', 'יעקב', 'יוסף', 'דוד', 'משה', 'אהרון', 'שרה', 'רחל', 'לאה', 'רבקה',
    'אסתר', 'רות', 'יהודה', 'בנימין', 'שמואל', 'נח', 'אברהם', 'יצחק', 'שלמה',
    'דניאל', 'מיכאל', 'גבריאל', 'נועה', 'תמר', 'יעל', 'חנה',
    // Car & vehicle brands (foreign proper nouns)
    'רנו', 'פיגו', 'פורד', 'יונדאי', 'טויוטה', 'הונדה', 'מאזדה', 'סובארו',
    'פולקסווגן', 'אאודי', 'במוו', 'מרצדס', 'קיה', 'ניסן', 'שברולט', 'פיאט',
    'אופל', 'סקודה', 'סיטרואן', 'דאצ\'יה', 'לקסוס', 'אינפיניטי', 'מיני',
    'טסלה', 'פורשה', 'פרארי', 'למבורגיני', 'מזראטי',
    // Sports/apparel brands
    'אדידס', 'נייקי', 'ריבוק', 'פומה', 'אנדר', 'אסיקס',
    // Tech/consumer brands
    'אפל', 'גוגל', 'מיקרוסופט', 'סמסונג', 'סוני', 'אינטל',
    // Prepositions & function words (can't anchor a compound term)
    'ליד', 'על', 'תחת', 'מתחת', 'בתוך', 'אצל', 'לפני', 'אחרי', 'בין', 'מול',
    'סביב', 'נגד', 'בעד', 'בלי', 'של',
  ]);
  const isWeakHeToken = (token: string, knownTokens: Set<string>): boolean => {
    if (HE_PROPER_BLOCKLIST.has(token)) return true;
    if (token.length >= 4 && HE_CLITICS.has(token[0])) {
      const stripped = token.slice(1);
      if (stripped.length >= 3 && knownTokens.has(stripped)) return true;
    }
    return false;
  };

  let compounds = rawCompounds;
  if (locale === 'he') {
    const knownTokens = new Set<string>();
    for (const c of rawCompounds) for (const p of c.split(/\s+/)) knownTokens.add(p);
    compounds = rawCompounds.filter((c) => {
      const [a, b] = c.split(/\s+/);
      return !isWeakHeToken(a, knownTokens) && !isWeakHeToken(b, knownTokens);
    });
    console.error(`[generate-puzzles] ${rawCompounds.length - compounds.length} compounds dropped by HE weak-token gate`);
  }
  console.error(`[generate-puzzles] ${compounds.length} two-word compound titles`);

  // HE-only: drop compounds whose article sits in a biographical / place /
  // award / work-of-art category on Wikipedia. Frequency filter is necessary
  // but insufficient — famous proper nouns (singers, cities, films) have
  // high WP hits but never form real lexicalized Hebrew smichut. Categories
  // are the authoritative taxonomic signal.
  if (locale === 'he' && compounds.length > 0) {
    const before = compounds.length;
    const catMap = await fetchPageCategories(cfg.host, compounds);
    compounds = compounds.filter((c) => {
      const cats = catMap.get(c);
      if (!cats || cats.length === 0) return true;
      return !hasRejectedCategory(cats, HE_REJECT_CATEGORY_PATTERNS);
    });
    console.error(
      `[generate-puzzles] ${before - compounds.length} compounds dropped by HE category filter (${compounds.length} remain)`,
    );
  }

  const allTriples = buildTriplesFromCompounds(compounds);
  console.error(`[generate-puzzles] ${allTriples.length} candidate triples built`);

  let triples = allTriples;
  if (minFreq > 0) {
    const lookup = makeCachedFreqLookup((bg) => fetchPhraseTotalHits(cfg.host, bg));
    const validated: typeof allTriples = [];
    let checked = 0;
    let lastLog = 0;
    for (const t of allTriples) {
      const res = await validateTripleAsync(t, lookup, { minFreq, locale });
      checked++;
      if (res.valid) validated.push(t);
      if (checked - lastLog >= 50) {
        console.error(`[generate-puzzles] validated ${checked}/${allTriples.length} (${validated.length} pass so far)`);
        lastLog = checked;
      }
      if (validated.length >= n * 4) break;
    }
    triples = validated;
    console.error(`[generate-puzzles] ${triples.length} triples passed CirrusSearch min-freq=${minFreq}`);
  }

  // Round-robin over bridges + cap cross-axes so synonymous neighbors don't repeat.
  // maxPerBridge bounds total share of any one bridge; the (bridge,word1) and
  // (bridge,word2) caps of 1 force genuine variety within each bridge cluster
  // (so e.g. only one `X ספורט חורף` and only one `ציוד ספורט X` survive).
  const maxPerBridge = 6;
  const byBridge = new Map<string, typeof triples>();
  for (const t of triples) {
    if (!byBridge.has(t.bridge)) byBridge.set(t.bridge, []);
    byBridge.get(t.bridge)!.push(t);
  }
  const chosen: typeof triples = [];
  const bridgeCount = new Map<string, number>();
  const seenBW1 = new Set<string>();
  const seenBW2 = new Set<string>();
  let anyAdded = true;
  while (chosen.length < n && anyAdded) {
    anyAdded = false;
    for (const [bridge, arr] of byBridge) {
      if (!arr.length) continue;
      if ((bridgeCount.get(bridge) ?? 0) >= maxPerBridge) continue;
      let pickedIdx = -1;
      for (let i = 0; i < arr.length; i++) {
        const t = arr[i];
        const k1 = `${bridge}::${t.word1}`;
        const k2 = `${bridge}::${t.word2}`;
        if (seenBW1.has(k1) || seenBW2.has(k2)) continue;
        pickedIdx = i;
        break;
      }
      if (pickedIdx === -1) {
        arr.length = 0;
        continue;
      }
      const t = arr.splice(pickedIdx, 1)[0];
      chosen.push(t);
      seenBW1.add(`${bridge}::${t.word1}`);
      seenBW2.add(`${bridge}::${t.word2}`);
      bridgeCount.set(bridge, (bridgeCount.get(bridge) ?? 0) + 1);
      anyAdded = true;
      if (chosen.length >= n) break;
    }
  }
  console.error(`[generate-puzzles] ${chosen.length} triples chosen across ${new Set(chosen.map((t) => t.bridge)).size} distinct bridges`);

  const content = renderPuzzleFile({
    exportName: cfg.exportName,
    difficulty: tier,
    idPrefix: cfg.idPrefix,
    startId: 1,
    triples: chosen,
  });

  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, content, 'utf8');
  console.error(`[generate-puzzles] wrote ${chosen.length} puzzles to ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
