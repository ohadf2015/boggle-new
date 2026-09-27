#!/usr/bin/env tsx
import { parseArgs } from 'node:util';
import { fetchCategoryMembers } from '../../lib/connections/generator/wiktionaryApi';
import { buildTriplesFromCompounds } from '../../lib/connections/generator/tripleBuilder';

interface LocaleConfig {
  host: string;
  scriptPattern: RegExp;
  categories: string[];
}

const LOCALES: Record<string, LocaleConfig> = {
  he: {
    host: 'he.wikipedia.org',
    scriptPattern: /^[א-ת]+$/,
    categories: [
      'קטגוריה:מאכלים',
      'קטגוריה:כלי נגינה',
      'קטגוריה:ספורט',
      'קטגוריה:צמחים',
      'קטגוריה:ספרים',
      'קטגוריה:דגים',
      'קטגוריה:מכוניות',
      'קטגוריה:כלי נשק',
      'קטגוריה:אדריכלות',
      'קטגוריה:משחקי מחשב',
      'קטגוריה:טכנולוגיה',
    ],
  },
  'he-wikt': {
    host: 'he.wiktionary.org',
    scriptPattern: /^[א-ת]+$/,
    categories: ['קטגוריה:ביטויים', 'קטגוריה:צירופים'],
  },
};

function isTwoWordCompound(title: string, scriptPattern: RegExp): boolean {
  if (/[()\[\].,:;"'\d]/.test(title)) return false;
  const parts = title.split(/\s+/);
  if (parts.length !== 2) return false;
  if (!parts.every((p) => p.length >= 3)) return false;
  return parts.every((p) => scriptPattern.test(p));
}

const HE_PREP_PREFIXES = /^[בלמכשוה]/;
function isPrepPrefixed(title: string): boolean {
  const parts = title.split(/\s+/);
  return parts.some((p) => HE_PREP_PREFIXES.test(p) && p.length <= 4);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      locale: { type: 'string', default: 'he' },
      sample: { type: 'string', default: '10' },
    },
  });

  const locale = String(values.locale ?? 'he');
  const sample = Number.parseInt(String(values.sample ?? '10'), 10);
  const cfg = LOCALES[locale];
  if (!cfg) throw new Error(`Unsupported locale: ${locale}`);

  console.error(`[diagnose] locale=${locale} host=${cfg.host}`);
  console.error(`[diagnose] ${cfg.categories.length} categories`);
  console.error('');

  const allCompounds: string[] = [];
  const perCat: { cat: string; total: number; compounds: number; prepFree: number; examples: string[] }[] = [];

  for (const cat of cfg.categories) {
    try {
      const titles = await fetchCategoryMembers(cfg.host, cat);
      const compounds = titles.filter((t) => isTwoWordCompound(t, cfg.scriptPattern));
      const prepFree = compounds.filter((t) => !isPrepPrefixed(t));
      const examples = prepFree.slice(0, sample);
      perCat.push({ cat, total: titles.length, compounds: compounds.length, prepFree: prepFree.length, examples });
      allCompounds.push(...prepFree);
      console.error(`[diagnose] ${cat}: total=${titles.length} 2word=${compounds.length} prepFree=${prepFree.length}`);
    } catch (e) {
      console.error(`[diagnose] ${cat}: ERROR ${(e as Error).message}`);
    }
  }

  const dedupedCompounds = Array.from(new Set(allCompounds));
  const triples = buildTriplesFromCompounds(dedupedCompounds);
  const bridgeCounts = new Map<string, number>();
  for (const t of triples) bridgeCounts.set(t.bridge, (bridgeCounts.get(t.bridge) ?? 0) + 1);

  console.error('');
  console.error('=== PER-CATEGORY ===');
  for (const row of perCat) {
    console.error(`\n[${row.cat}] total=${row.total} compounds=${row.compounds} prepFree=${row.prepFree}`);
    if (row.examples.length) {
      console.error(`  examples: ${row.examples.join(' | ')}`);
    }
  }

  console.error('');
  console.error('=== TRIPLE YIELD (all categories combined, prep-free) ===');
  console.error(`unique compounds: ${dedupedCompounds.length}`);
  console.error(`triples: ${triples.length}`);
  console.error(`distinct bridges: ${bridgeCounts.size}`);

  const topBridges = [...bridgeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20);
  console.error('\ntop bridges:');
  for (const [bridge, count] of topBridges) {
    const examples = triples.filter((t) => t.bridge === bridge).slice(0, 3).map((t) => `${t.word1} ${bridge} ${t.word2}`);
    console.error(`  ${bridge} (${count}): ${examples.join(' | ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
