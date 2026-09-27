/**
 * Guardrail: every `t('...')` key used by the education surface must exist in all six
 * locales.
 *
 * Why this scans source instead of diffing dictionaries: `scripts/translation-report.json`
 * gates on DELTAS against a baseline, so a namespace that was never added anywhere is
 * invisible to it. That is exactly how the whole `education.landing.pro.*` block — the
 * pricing section on /education and half the /teacher/upgrade table — shipped with 18 keys
 * missing from every locale. `t()` returns the key path when the lookup fails, so the page
 * rendered the literal string "education.landing.pro.title" to every visitor instead of
 * throwing or blanking.
 *
 * Scope is the two education directories plus the named teacher keys they share with
 * /teacher/upgrade. Keep it that way: a repo-wide scan would fail on any other in-flight
 * feature branch and stop being a signal about education.
 */
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

const CATALOGUES: [string, unknown][] = [
  ['en', en], ['es', es], ['he', he], ['ja', ja], ['ru', ru], ['sv', sv],
];

const FE_NEXT = path.resolve(__dirname, '../../../..');
const SCAN_DIRS = [
  path.join(FE_NEXT, 'app/[locale]/education'),
  path.join(FE_NEXT, 'components/education'),
];

/** Keys the education pages hand off to — same strings, rendered by the upgrade funnel. */
const SHARED_TEACHER_KEYS = [
  'teacher.proGate.cta',
  'teacher.subscription.checkoutUnavailable',
  'teacher.subscription.featureOutcome1',
  'teacher.subscription.featureOutcome2',
  'teacher.subscription.featureOutcome3',
  'teacher.subscription.featureOutcome4',
  'teacher.subscription.matrix.title',
  'teacher.subscription.matrix.featureColumn',
  'teacher.subscription.matrix.unlimited',
  'teacher.subscription.priceTaxNote',
  'teacher.subscription.proHeroAlt',
  'teacher.subscription.valueHeadline',
  'teacher.dashboard.studentsPresentTitle',
  'teacher.dashboard.studentsPresentDescription',
];

function sourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    if (!/\.tsx?$/.test(entry.name) || /\.test\.tsx?$/.test(entry.name)) return [];
    return [full];
  });
}

/** Only literal, fully-qualified keys — a computed key can't be checked statically. */
function usedKeys(): Map<string, string> {
  const keys = new Map<string, string>();
  for (const dir of SCAN_DIRS) {
    for (const file of sourceFiles(dir)) {
      const src = fs.readFileSync(file, 'utf8');
      for (const match of Array.from(src.matchAll(/\bt\(\s*['"]([A-Za-z0-9_.-]+\.[A-Za-z0-9_.-]+)['"]/g))) {
        if (!keys.has(match[1])) keys.set(match[1], path.relative(FE_NEXT, file));
      }
    }
  }
  return keys;
}

const resolve = (catalogue: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>(
    (node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined),
    catalogue
  );

describe('education translation keys', () => {
  const keys = usedKeys();

  it('finds the education surface to scan', () => {
    // A rename that empties SCAN_DIRS would otherwise make this whole file vacuously green.
    expect(keys.size).toBeGreaterThan(200);
  });

  it.each(CATALOGUES)('%s has every key the education pages ask for', (_locale, catalogue) => {
    const missing = Array.from(keys)
      .filter(([key]) => typeof resolve(catalogue, key) !== 'string')
      .map(([key, file]) => `${key}  (${file})`);
    expect(missing).toEqual([]);
  });

  it.each(CATALOGUES)('%s has the teacher keys the education funnel hands off to', (_locale, catalogue) => {
    const missing = SHARED_TEACHER_KEYS.filter((key) => typeof resolve(catalogue, key) !== 'string');
    expect(missing).toEqual([]);
  });
});
