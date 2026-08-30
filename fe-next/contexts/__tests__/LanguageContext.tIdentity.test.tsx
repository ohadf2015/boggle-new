/**
 * Contract: `t`'s identity must change when the dictionary finishes loading.
 *
 * `t` reads translations from a ref, so its identity used to depend only on
 * `language`. Any memoized subtree that painted during the async load window
 * therefore kept its stale `t` prop and rendered raw key paths FOREVER — nothing
 * ever re-rendered it. Components with a ticking prop (score, timer) healed
 * themselves, which is exactly why this survived so long unnoticed.
 *
 * Observed in a real browser: `practice.coach.label` / `practice.coach.dismiss`
 * on PracticeCoachTip, and `playerView.swipeHintShort` in the shared game shell.
 * All three keys exist in translations/en.js — they were never missing copy.
 *
 * Listing `translationsReady` in the dep array is the whole fix: the value is not
 * read inside `t`, it exists to give consumers one re-render when the dictionary
 * lands.
 *
 * This is asserted at the source level on purpose. Under jsdom the translations
 * are already bundled, so `translationsReady` starts true and never flips — a
 * render-based test passes whether or not the bug is present, which makes it
 * worse than useless. The behaviour was verified in Chrome.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('LanguageContext t identity contract', () => {
  const source = readFileSync(join(process.cwd(), 'contexts/LanguageContext.tsx'), 'utf8');

  it('keys the t callback on translationsReady, not language alone', () => {
    // The dep array closing the `t` useCallback, i.e. the one right after the
    // final `interpolate(...)` return inside it.
    const tCallbackEnd = source.indexOf('}, [language, translationsReady]);');

    expect(
      tCallbackEnd,
      "`t` is memoized on [language] alone. Memoized consumers that render " +
        'during the dictionary load window will show raw key paths forever. Add ' +
        'translationsReady to the dep array (it is a re-render signal, not a ' +
        'value read inside the callback).',
    ).toBeGreaterThan(-1);
  });

  it('still reads translations from the ref, so the dep is identity-only', () => {
    // Guards the reason the dep looks unused: if `t` ever starts reading state
    // directly, this comment-and-contract pairing needs revisiting.
    expect(source).toMatch(/let current: unknown = translationsRef\.current;/);
  });
});
