/**
 * Sanity-checks the locales that fall through to GeneratedLevelSource (ja, and
 * every locale past the authored chain packs). The board word floor feeds the
 * generator's unintended-word screen, so a floor that is too high for a locale
 * shows up here as `could not generate level`.
 *
 * Run: npx tsx scripts/blast/audit-generated-locales.ts
 */
import { GeneratedLevelSource } from '@/lib/blast/v2/generator';
import { findExtraWords, boardWordMinLength } from '@/lib/blast/v2/engine/extra-word-check';
import { getBlastCommonWords } from '@/lib/blast/v2/engine/common-words';
import { LOCALE_CONFIGS } from '@/lib/blast/v2/locale-config';
import type { Locale } from '@/lib/blast/v2/types';

const LOCALES: Locale[] = ['ja', 'en', 'he', 'sv', 'es'];
const LEVELS = [1, 5, 12, 20, 31, 40, 55];

async function main() {
  const source = new GeneratedLevelSource(LOCALE_CONFIGS);
  for (const locale of LOCALES) {
    const minLen = boardWordMinLength(LOCALE_CONFIGS[locale]);
    const isCommon = await getBlastCommonWords(locale);
    let ok = 0;
    let extras = 0;
    const failures: string[] = [];
    for (const n of LEVELS) {
      try {
        const level = await source.resolve(n, locale);
        ok++;
        extras += findExtraWords(level, isCommon, minLen).length;
      } catch (err) {
        failures.push(`L${n}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    console.log(
      `${locale}: floor=${minLen} generated=${ok}/${LEVELS.length} commonExtras=${extras}` +
        (failures.length ? `\n  ${failures.join('\n  ')}` : ''),
    );
  }
}

main();
