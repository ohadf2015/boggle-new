// Manual smoke: compare richness of plain vs rich-selected boards.
// Run: npx tsx backend/scripts/smoke/boardSelection.smoke.ts
import { generateRandomTable } from '../../utils/gameUtils';
import { generateRichBoard, scoreBoardRichness } from '../../utils/boardSelection';
import { ensureLanguageLoaded } from '../../dictionary';

async function main() {
  const langs = ['en', 'he'] as const;
  for (const lang of langs) await ensureLanguageLoaded(lang);
  const samples = 20;
  const sizes: Array<[number, number]> = [[4, 4], [5, 5], [6, 6]];

  for (const lang of langs) {
  for (const [r, c] of sizes) {
    const plain: number[] = [];
    const rich: number[] = [];
    for (let i = 0; i < samples; i++) {
      const p = generateRandomTable(r, c, lang as 'en' | 'he');
      plain.push(scoreBoardRichness(p, lang));
      const ri = generateRichBoard(() => generateRandomTable(r, c, lang as 'en' | 'he'), lang, r, c, 6);
      rich.push(scoreBoardRichness(ri, lang));
    }
    const avg = (a: number[]) => Math.round(a.reduce((s, x) => s + x, 0) / a.length);
    const min = (a: number[]) => Math.min(...a);
    const max = (a: number[]) => Math.max(...a);
    console.log(`${lang} ${r}x${c}  plain avg=${avg(plain)} min=${min(plain)} max=${max(plain)}`);
    console.log(`${lang} ${r}x${c}  rich  avg=${avg(rich)} min=${min(rich)} max=${max(rich)}`);
  }
  }
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
