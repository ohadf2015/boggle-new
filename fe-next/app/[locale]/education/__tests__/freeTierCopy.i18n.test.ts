/**
 * The free-tier NUMBERS, in every locale's translation catalogue.
 *
 * `educationClaims.test.ts` guards the education landing pages' own `content.ts`
 * files. It cannot see `translations/*.js` — and that is precisely where the
 * 2026-08-31 tier change (10 -> 50 students, 1 -> 3 classes) never landed. Six
 * locales, including English, went on telling teachers the free plan is
 * "one class of 10 students" in the pricing block, the cancel FAQ, and the Pro
 * feature list, months after the product stopped enforcing that.
 *
 * The guard matches the CLAIM, not one phrasing: any number attached to a
 * student-count or class-count noun anywhere under `teacher.*` or `education.*`
 * must be the number `lib/education/freeTierLimits.ts` actually enforces.
 * Interpolated copy (`Up to {count} students`) carries no digit and passes by
 * construction — which is the shape new pricing strings should be written in.
 */
import { describe, it, expect } from 'vitest';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

const CATALOGUES: Array<[string, unknown]> = [
  ['en', en], ['es', es], ['he', he], ['ja', ja], ['ru', ru], ['sv', sv],
];

/** Only the teacher/education surface. A repo-wide scan would fail on unrelated copy. */
const IN_SCOPE = /^(teacher|education)\./;

function walk(node: unknown, path: string[] = []): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  if (typeof node === 'string') return [[path.join('.'), node]];
  if (!node || typeof node !== 'object') return out;
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    out.push(...walk(v, [...path, k]));
  }
  return out;
}

const STUDENTS = FREE_TIER_LIMITS.studentsPerClass;
const CLASSES = FREE_TIER_LIMITS.classes;

/**
 * "<number> <student-noun>" in each locale. `人` is the Japanese counter for
 * people and is how every JA student-cap string in this repo is written.
 */
const STUDENT_COUNT: RegExp[] = [
  /(\d{1,3})\s*students?\b/gi,
  /(\d{1,3})\s*(?:estudiantes|alumnos)/g,
  /(\d{1,3})\s*תלמידים/g,
  /(\d{1,3})\s*人/g,
  /(\d{1,3})\s*(?:ученик|учеников|ученика|учащихся)/g,
  /(\d{1,3})\s*elever/g,
];

/** "<number> <class-noun>", plus the spelled-out "one class" each locale uses. */
const CLASS_COUNT: RegExp[] = [
  /(\d{1,3})\s*class(?:es|room|rooms)?\b/gi,
  /(\d{1,3})\s*clases?/g,
  /(\d{1,3})\s*כיתות/g,
  /(\d{1,3})\s*クラス(?!あたり)/g,
  /(\d{1,3})\s*класс(?:а|ов)?/g,
  /(\d{1,3})\s*klass(?:er)?/g,
];

const SPELLED_ONE_CLASS =
  /\bone class\b|\buna clase\b|כיתה אחת|\ben klass\b|\bодин класс\b|1クラス(?!あたり)/i;

/**
 * A number next to "students" is only a PRICING claim in pricing context.
 * Without this gate the guard fires on `teacher.classroom.member` ("1 student",
 * a roster label) and on "COPPA-compliant for under-13 student use" — true
 * statements that happen to put a digit beside the noun. A string qualifies by
 * where it lives (a subscription/plan/FAQ key) or by what it says (an explicit
 * cap or free-plan phrase in any of the six languages).
 */
const CAP_KEY = /subscription|pricing|price|plan|tier|limit|upgrade|freeStudents|freeClasses|faq/i;
const CAP_TEXT =
  /free[- ]?(plan|tier|basic)|up to \d|plan (gratis|gratuito|básico)|hasta \d|límites|מסלול|עד \d|無料プラン|上限|бесплатн|gratisplan|upp till \d/i;

function inCapContext(key: string, value: string): boolean {
  return CAP_KEY.test(key) || CAP_TEXT.test(value);
}

function offenders(
  entries: Array<[string, string]>,
  patterns: RegExp[],
  expected: number,
): string[] {
  const bad: string[] = [];
  for (const [key, value] of entries) {
    if (!inCapContext(key, value)) continue;
    for (const re of patterns) {
      for (const m of value.matchAll(re)) {
        if (Number(m[1]) !== expected) bad.push(`${key}: "${m[0]}" in "${value.slice(0, 110)}"`);
      }
    }
  }
  return bad;
}

describe.each(CATALOGUES)('%s translations — free-tier numbers', (locale, catalogue) => {
  const entries = walk(catalogue).filter(([k]) => IN_SCOPE.test(k));

  it('has teacher/education strings to check', () => {
    expect(entries.length).toBeGreaterThan(50);
  });

  it(`never advertises a per-class student cap other than ${STUDENTS}`, () => {
    expect(offenders(entries, STUDENT_COUNT, STUDENTS).join('\n') || null).toBeNull();
  });

  it(`never advertises a free class count other than ${CLASSES}`, () => {
    expect(offenders(entries, CLASS_COUNT, CLASSES).join('\n') || null).toBeNull();
  });

  it('never says the free plan is a single class in words', () => {
    const bad = entries
      .filter(([k, v]) => inCapContext(k, v) && SPELLED_ONE_CLASS.test(v))
      .map(([k, v]) => `${k}: "${v.slice(0, 110)}"`);
    expect(bad.join('\n') || null).toBeNull();
  });
});

describe('locale coverage', () => {
  it('checks every shipped locale', () => {
    expect(CATALOGUES.map(([l]) => l).sort()).toEqual(['en', 'es', 'he', 'ja', 'ru', 'sv']);
  });
});
