import { describe, it, expect } from 'vitest';
import { loadTranslation } from '@/translations/loadTranslation';
import type { Language } from '@/types';

/**
 * Regression guard for the WordCraft clue rendering the literal placeholder
 * ("Try: {word}") instead of the suggested word.
 *
 * Root cause was a brittle manual interpolation at the render site:
 *   t('wordcraft.clue.reveal').replace('{{word}}', clueReveal.word)
 * The hard-coded `'{{word}}'` only matches a DOUBLE-brace placeholder. If any
 * locale's string drifts to a single-brace `{word}` (or a deploy ships a
 * mismatched bundle), the replace silently no-ops and the raw placeholder
 * leaks to the player. The fix passes the param to t() instead:
 *   t('wordcraft.clue.reveal', { word: clueReveal.word })
 * which interpolates `${word}`, `{{word}}`, AND `{word}` alike (see
 * LanguageContext) — drift-proof.
 *
 * This test pins the data contract: every locale's clue string must carry a
 * `word` placeholder in a form t() can substitute, and substitution must leave
 * NO stray braces. It mirrors the t() interpolation regex exactly.
 */

const LANGS: readonly Language[] = ['en', 'he', 'sv', 'ja', 'es'];

// Mirrors the three-format interpolation in contexts/LanguageContext.tsx t().
function interpolate(template: string, params: Record<string, string | number>): string {
  let result = template.replace(/\$\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
  result = result.replace(/\{\{(\w+)\}\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
  result = result.replace(/\{(\w+)\}/g, (m, k) => (params[k] !== undefined ? String(params[k]) : m));
  return result;
}

function resolvePath(obj: unknown, path: string): unknown {
  return path
    .split('.')
    .reduce<unknown>(
      (acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined),
      obj,
    );
}

const CLUE_KEY = 'wordcraft.clue.reveal';

describe('WordCraft clue — i18n interpolation (placeholder-leak regression)', () => {
  it.each(LANGS)('resolves %s clue to a real string with a word placeholder', async (lang) => {
    const data = await loadTranslation(lang);
    const tpl = resolvePath(data, CLUE_KEY);
    expect(typeof tpl, `${lang}: "${CLUE_KEY}" must resolve to a string`).toBe('string');
    expect(tpl).not.toBe(CLUE_KEY); // not a missing-key fallback
    // Must contain a t()-substitutable `word` placeholder in one of the 3 forms.
    expect(
      /(\$\{word\}|\{\{word\}\}|\{word\})/.test(tpl as string),
      `${lang}: "${tpl}" must contain a {word}/{{word}}/\${word} placeholder`,
    ).toBe(true);
  });

  it.each(LANGS)('substitutes the word and leaves no stray braces in %s', async (lang) => {
    const data = await loadTranslation(lang);
    const tpl = resolvePath(data, CLUE_KEY) as string;
    const out = interpolate(tpl, { word: 'CAT' });
    expect(out, `${lang}: expected "CAT" in interpolated clue`).toContain('CAT');
    expect(out, `${lang}: literal "{" leaked: "${out}"`).not.toContain('{');
    expect(out, `${lang}: literal "}" leaked: "${out}"`).not.toContain('}');
  });
});
