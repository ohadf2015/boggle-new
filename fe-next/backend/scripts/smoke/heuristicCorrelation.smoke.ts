// Compare heuristic ranking vs real solver ranking on identical boards.
// Run: npx tsx backend/scripts/smoke/heuristicCorrelation.smoke.ts
import { generateRandomTable } from '../../utils/gameUtils';
import { scoreBoardRichness } from '../../utils/boardSelection';
import { ensureLanguageLoaded } from '../../dictionary';
import { scoreBoardHeuristic, pickRichestBoardClient } from '../../../lib/boardSelection';

async function main() {
  const langs = ['en', 'he'] as const;
  for (const lang of langs) await ensureLanguageLoaded(lang);
  const sizes: Array<[number, number]> = [[4, 4], [5, 5], [6, 6]];

  for (const lang of langs) {
    for (const [r, c] of sizes) {
      const samples = 30;
      const rows: Array<{ heuristic: number; real: number }> = [];
      for (let i = 0; i < samples; i++) {
        const g = generateRandomTable(r, c, lang as 'en' | 'he');
        rows.push({
          heuristic: scoreBoardHeuristic(g, lang),
          real: scoreBoardRichness(g, lang),
        });
      }
      // Spearman-ish: rank both, count concordant pairs
      const byH = [...rows].sort((a, b) => a.heuristic - b.heuristic);
      const byR = [...rows].sort((a, b) => a.real - b.real);
      const heRank = new Map(byH.map((x, i) => [x, i]));
      const reRank = new Map(byR.map((x, i) => [x, i]));
      let concordant = 0;
      let total = 0;
      for (let i = 0; i < rows.length; i++) {
        for (let j = i + 1; j < rows.length; j++) {
          total++;
          const dh = (heRank.get(rows[i])! - heRank.get(rows[j])!);
          const dr = (reRank.get(rows[i])! - reRank.get(rows[j])!);
          if (Math.sign(dh) === Math.sign(dr)) concordant++;
        }
      }
      const pct = Math.round((concordant / total) * 100);

      // Best-of-K smoke: heuristic-picked grid vs random
      const k = 8;
      const realRandom: number[] = [];
      const realPicked: number[] = [];
      for (let i = 0; i < 20; i++) {
        const rnd = generateRandomTable(r, c, lang as 'en' | 'he');
        realRandom.push(scoreBoardRichness(rnd, lang));
        const picked = pickRichestBoardClient(
          () => generateRandomTable(r, c, lang as 'en' | 'he'),
          lang,
          k
        );
        realPicked.push(scoreBoardRichness(picked, lang));
      }
      const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
      console.log(`${lang} ${r}x${c}  concordance=${pct}%  random_avg=${avg(realRandom)}  picked_avg=${avg(realPicked)}`);
    }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
