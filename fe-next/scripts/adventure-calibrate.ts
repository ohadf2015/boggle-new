/**
 * Re-measure adventure board yield: run with `npx tsx scripts/adventure-calibrate.ts`.
 * Feeds PAR_K and MEDIAN_BOARD_TOTAL in lib/adventure/play/levels.ts — rerun after
 * any change to the word-score table or the letter distribution.
 */
import { generateRandomTable } from '@/utils/utils';
import { pickRichestBoardClient, scoreBoardHeuristic } from '@/lib/boardSelection';
import * as solver from '@/backend/modules/boggleSolver';
const { findAllWords, buildTrie } = solver;
import { getEnglishWordSet } from '@/lib/server/sharedWordSets';
import { calculateWordScore } from '@/shared/utils/scoring';
import { getWordRarity, getRarityMultiplier } from '@/shared/utils/wordFrequency';

const N = 120;
const pts = (w: string, rar: boolean) =>
  calculateWordScore(w, 0, 1, rar ? getRarityMultiplier(getWordRarity(w)) : 1);

const pct = (a: number[], p: number) => a.slice().sort((x, y) => x - y)[Math.floor((a.length - 1) * p)];

async function main() {
  const set = await getEnglishWordSet();
  console.log('dict size', set.size);
  const trie = buildTrie(set);

  for (const size of [4, 5]) {
    for (const minLength of [3, 4]) {
      const totals: number[] = [];
      const counts: number[] = [];
      const topN: Record<number, number[]> = { 5: [], 8: [], 12: [], 18: [] };
      const heur: number[] = [];
      for (let i = 0; i < N; i++) {
        const grid = pickRichestBoardClient(
          () => generateRandomTable(size, size, 'en' as any),
          'en',
        ) as string[][];
        heur.push(scoreBoardHeuristic(grid, 'en'));
        const words = findAllWords(grid, 'en', { minLength, maxLength: 12, maxWords: 2000, trie });
        const scored = words.map((w) => pts(w, true)).sort((a, b) => b - a);
        totals.push(scored.reduce((s, v) => s + v, 0));
        counts.push(scored.length);
        for (const n of [5, 8, 12, 18]) topN[n].push(scored.slice(0, n).reduce((s, v) => s + v, 0));
      }
      console.log(
        `size=${size} min=${minLength} words p10/p50/p90=${pct(counts,.1)}/${pct(counts,.5)}/${pct(counts,.9)}`,
        `| TOTAL p10/p50/p90=${pct(totals,.1)}/${pct(totals,.5)}/${pct(totals,.9)}`,
      );
      for (const n of [5, 8, 12, 18]) {
        console.log(`   best-${n}-words p10/p50/p90 = ${pct(topN[n],.1)} / ${pct(topN[n],.5)} / ${pct(topN[n],.9)}`);
      }
    }
  }
}
main().catch((e) => { console.error(e); process.exit(1); });
