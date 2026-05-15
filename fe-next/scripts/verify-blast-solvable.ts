import { verifyAllChainLevels } from '../lib/blast/v2/solvability-verifier';
import type { Locale } from '../lib/blast/v2/types';

async function main() {
  const locales: Locale[] = ['en', 'he'];
  let totalFailures = 0;
  for (const locale of locales) {
    const results = await verifyAllChainLevels(locale);
    const failures = results.filter((r) => !r.ok);
    totalFailures += failures.length;
    console.log(`${locale.toUpperCase()}: ${results.length - failures.length}/${results.length} solvable`);
    for (const f of failures) {
      console.log(`  FAIL ${f.id} (lvl ${f.levelNumber}): ${(f as { reason: string }).reason}`);
    }
  }
  process.exit(totalFailures > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
