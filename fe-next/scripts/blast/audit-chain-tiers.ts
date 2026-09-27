/**
 * Measures, for every shipped chain level, whether the tier-1 (common-word
 * screened) build succeeds or chain-pack-source falls back to tier 2 with the
 * screen dropped entirely. Tier-2 boards are the ones that can carry many
 * unintended selectable words. Run: npx tsx scripts/blast/audit-chain-tiers.ts
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildChainLevel, type ExtraWordCheck } from '@/lib/blast/v2/engine/chain-builder';
import { findExtraWords } from '@/lib/blast/v2/engine/extra-word-check';
import { getBlastCommonWords } from '@/lib/blast/v2/engine/common-words';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import type { ChainLevelSpec, Locale } from '@/lib/blast/v2/types';

const LOCALES: Locale[] = ['en', 'he', 'sv', 'es'];
const PACKS = resolve(process.cwd(), 'content/blast/packs');

async function main() {
  for (const locale of LOCALES) {
    let pack: { levels: ChainLevelSpec[] };
    try {
      pack = JSON.parse(await readFile(join(PACKS, locale, 'pack-chain.json'), 'utf8'));
    } catch {
      console.log(`${locale}: NO PACK`);
      continue;
    }
    const isCommon = await getBlastCommonWords(locale);
    const minLength = Math.max(4, LOCALE_CONFIGS[locale].wordLengthRange.min);
    const check: ExtraWordCheck = { isCommon, minLength };
    let tier1 = 0;
    let tier2 = 0;
    let failed = 0;
    const tier2Levels: number[] = [];
    for (const spec of pack.levels) {
      const budget = spec.columns <= 5 ? 600 : 3000;
      const t0 = Date.now();
      const a = buildChainLevel(spec, spec.levelNumber, check, budget);
      if (a) {
        tier1++;
        continue;
      }
      const b = buildChainLevel(spec, spec.levelNumber);
      if (b) {
        tier2++;
        tier2Levels.push(spec.levelNumber);
        const extras = findExtraWords(b, isCommon, minLength);
        console.log(
          `  ${locale} L${spec.levelNumber} TIER2 (${Date.now() - t0}ms) extras=${extras.length} ${extras.slice(0, 8).join(',')}`,
        );
      } else {
        failed++;
        console.log(`  ${locale} L${spec.levelNumber} FAILED BOTH`);
      }
    }
    console.log(
      `${locale}: tier1=${tier1} tier2=${tier2} failed=${failed} tier2Levels=[${tier2Levels.join(',')}]`,
    );
  }
}

main();
