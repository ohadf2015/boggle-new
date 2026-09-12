/**
 * Gate: no practice surface may render a raw i18n interpolation placeholder.
 *
 * Round 1 shipped `t('education.practice.points')` — "{{count}} pts" — as a
 * bare stat LABEL on the Solo Board completion card. The card showed
 *
 *     100
 *     {{count}} pts
 *
 * on the one screen whose whole job is to feel like a reward, and a blind
 * critic disqualified the round for it. A placeholder key is invisible in
 * review (the call site reads like any other `t(...)`) and invisible to type
 * checking, so it needs a mechanical gate rather than vigilance.
 *
 * The rule: if a translation VALUE contains an interpolation token, every call
 * site for that key must pass a params object. A bare `t(key)` — or
 * `t(key, 'fallback')`, which looks like it supplies data but does not — fails.
 * All six locales are checked: a string can be placeholder-free in en and
 * interpolated in he or ru.
 */

import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

import { en } from '@/translations/en';
import { he } from '@/translations/he';
import { sv } from '@/translations/sv';
import { ja } from '@/translations/ja';
import { es } from '@/translations/es';
import { ru } from '@/translations/ru';

/** Surfaces owned by the solo-practice loop. */
const PRACTICE_DIRS = [
  'components/practice',
  'components/education/practice',
  'components/education/practicePicker',
  'app/[locale]/student/lessons/[id]',
];

const PLACEHOLDER = /\{\{\s*[A-Za-z0-9_]+\s*\}\}|\{\s*[A-Za-z0-9_]+\s*\}|\$\{\s*[A-Za-z0-9_]+\s*\}/;

const REPO_ROOT = path.resolve(__dirname, '../../../..');

type Dict = Record<string, unknown>;

const LOCALES: Array<[string, Dict]> = [
  ['en', en as unknown as Dict],
  ['he', he as unknown as Dict],
  ['sv', sv as unknown as Dict],
  ['ja', ja as unknown as Dict],
  ['es', es as unknown as Dict],
  ['ru', ru as unknown as Dict],
];

function lookup(dict: Dict, dottedKey: string): unknown {
  return dottedKey.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Dict)[part];
    return undefined;
  }, dict);
}

function sourceFiles(dir: string): string[] {
  const abs = path.join(REPO_ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  const out: string[] = [];
  const walk = (current: string) => {
    for (const entry of fs.readdirSync(current)) {
      const full = path.join(current, entry);
      if (fs.statSync(full).isDirectory()) {
        if (entry === '__tests__') continue;
        walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      if (/\.test\.|\.spec\./.test(entry)) continue;
      out.push(full);
    }
  };
  walk(abs);
  return out;
}

/**
 * Matches `t('some.key'` and captures the character that follows the key, so a
 * call with params (`, {`) can be told apart from a bare call (`)`) and from a
 * string fallback (`, '`), which does NOT fill placeholders.
 */
const T_CALL = /\bt\(\s*'([A-Za-z0-9_.]+)'\s*(\)|,\s*\{|,\s*[^{])/g;

interface Offence {
  file: string;
  line: number;
  key: string;
  locale: string;
  value: string;
}

function findOffences(): Offence[] {
  const offences: Offence[] = [];
  for (const dir of PRACTICE_DIRS) {
    for (const file of sourceFiles(dir)) {
      const src = fs.readFileSync(file, 'utf8');
      let match: RegExpExecArray | null;
      T_CALL.lastIndex = 0;
      while ((match = T_CALL.exec(src)) !== null) {
        const [, key, tail] = match;
        const suppliesParams = tail.startsWith(',') && tail.trimStart().startsWith(',{')
          ? true
          : /,\s*\{$/.test(tail);
        if (suppliesParams) continue;
        for (const [locale, dict] of LOCALES) {
          const value = lookup(dict, key);
          if (typeof value !== 'string') continue;
          if (!PLACEHOLDER.test(value)) continue;
          offences.push({
            file: path.relative(REPO_ROOT, file),
            line: src.slice(0, match.index).split('\n').length,
            key,
            locale,
            value,
          });
        }
      }
    }
  }
  return offences;
}

describe('practice surfaces — raw i18n placeholders', () => {
  it('never calls t() without params for an interpolated string', () => {
    const offences = findOffences();
    const report = offences
      .map((o) => `${o.file}:${o.line} ${o.key} [${o.locale}] => ${JSON.stringify(o.value)}`)
      .join('\n');
    expect(report).toBe('');
  });

  it('has the label-only points key the completion card needs', () => {
    for (const [locale, dict] of LOCALES) {
      const value = lookup(dict, 'student.practiceFun.points');
      expect(typeof value, `${locale} student.practiceFun.points`).toBe('string');
      expect(PLACEHOLDER.test(value as string), `${locale} points must be a plain label`).toBe(false);
    }
  });
});
