/**
 * Counts how many *selectable* words a Wordfall board offers at each step of
 * the intended solve, using the SAME rules validateSelection uses: straight
 * contiguous H/V runs, length >= 2, either reading direction, full game
 * dictionary (not just the common-word screen).
 *
 * Run: npx tsx scripts/blast/audit-board-options.ts [locale] [minLen]
 */
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { buildChainLevel, type ExtraWordCheck } from '@/lib/blast/v2/engine/chain-builder';
import { findExtraWords } from '@/lib/blast/v2/engine/extra-word-check';
import { getBlastCommonWords } from '@/lib/blast/v2/engine/common-words';
import { collapseCells } from '@/lib/blast/v2/engine/collapse';
import { detectAllCascades } from '@/lib/blast/v2/engine/cascade';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import { getEnglishWordSet } from '@/lib/server/sharedWordSets';
import type { BlastLevel, ChainLevelSpec, Locale } from '@/lib/blast/v2/types';

const PACKS = resolve(process.cwd(), 'content/blast/packs');

async function main() {
  const locale = (process.argv[2] ?? 'en') as Locale;
  const minLen = Number(process.argv[3] ?? 2);
  if (locale !== 'en') throw new Error('full-dictionary audit wired for en only');
  const dict = await getEnglishWordSet();
  const isWord = (w: string) => dict.has(w.toLowerCase());
  const config = LOCALE_CONFIGS[locale];

  const pack: { levels: ChainLevelSpec[] } = JSON.parse(
    await readFile(join(PACKS, locale, 'pack-chain.json'), 'utf8'),
  );
  const isCommon = await getBlastCommonWords(locale);
  const check: ExtraWordCheck = { isCommon, minLength: Math.max(4, config.wordLengthRange.min) };

  let totalStates = 0;
  let totalExtras = 0;
  let worst = { level: 0, step: 0, count: 0, sample: [] as string[] };

  for (const spec of pack.levels) {
    const budget = spec.columns <= 5 ? 600 : 3000;
    const level =
      buildChainLevel(spec, spec.levelNumber, check, budget) ??
      buildChainLevel(spec, spec.levelNumber);
    if (!level) {
      console.log(`L${spec.levelNumber}: BUILD FAILED`);
      continue;
    }
    let board: BlastLevel = level;
    const found = new Set<string>();
    const perStep: number[] = [];
    for (let step = 0; step < spec.chain.length; step++) {
      const extras = findExtraWords(board, isWord, minLen);
      perStep.push(extras.length);
      totalStates++;
      totalExtras += extras.length;
      if (extras.length > worst.count) {
        worst = {
          level: spec.levelNumber,
          step,
          count: extras.length,
          sample: extras.slice(0, 10),
        };
      }
      // Advance along the intended solve: clear the next formable theme word.
      const next = detectAllCascades(board, found, config)[0];
      if (!next) break;
      found.add(next.word);
      board = collapseCells(board, next.cells).level;
    }
    console.log(`L${spec.levelNumber} (${spec.chain.length} words): options/step = [${perStep.join(',')}]`);
  }
  console.log(
    `\n${locale} minLen=${minLen}: states=${totalStates} totalExtraOptions=${totalExtras} avg=${(totalExtras / Math.max(1, totalStates)).toFixed(1)}`,
  );
  console.log(`worst: L${worst.level} step ${worst.step} → ${worst.count} extras e.g. ${worst.sample.join(',')}`);
}

main();
