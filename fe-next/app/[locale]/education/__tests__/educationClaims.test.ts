import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';

/**
 * The teacher-moment pages get their claims checked by
 * teacherMomentContent.test.ts. The *older* education pages had no guard at all,
 * which is how one false pricing claim became 130+ instances across twelve files
 * and six languages before anyone noticed.
 *
 * This reads the raw source rather than importing the modules, because these
 * files export half a dozen different shapes (LocaleContent, ForSchoolsContent,
 * educationSeoContent, ...) and the claim can hide in any string in any of them.
 */
const ROOT = join(__dirname, '..', '..', '..', '..');

const FILES = [
  'app/[locale]/education/seoContent.ts',
  'app/[locale]/education/esl-word-games/content.ts',
  'app/[locale]/education/for-schools/content.ts',
  'app/[locale]/education/games-for-teachers/content.ts',
  'app/[locale]/education/sight-words-practice/content.ts',
  'app/[locale]/education/spelling-bee-practice/content.ts',
  'app/[locale]/education/vocabulary-games-classroom/content.ts',
  'app/[locale]/hebrew-classroom-vocabulary-games/content.ts',
  'app/[locale]/substitute-teacher-word-games/content.ts',
  'app/[locale]/word-games-for-the-classroom/content.ts',
  'app/[locale]/education/page.tsx',
  'public/llms.txt',
];

/**
 * Ground truth, all verified in code:
 *   lib/education/freeTierLimits.ts → 3 classes, 10 students/class, $9/mo Pro
 *   i18n/config.ts                  → six locales
 */
const FORBIDDEN: Array<[string, RegExp]> = [
  [
    'promises the product is free forever, but Teacher Pro is a real paid tier',
    /Free Forever|free forever|Free forever|חינם לתמיד|för alltid gratis|gratis för alltid|[Ss]iempre gratis|gratis para siempre|para siempre gratis|[Gg]ratis siempre|永久無料|ずっと無料|навсегда бесплатн|[Вв]сегда бесплатн/,
  ],
  [
    'denies the premium tier or a per-seat limit that lib/education/freeTierLimits.ts enforces',
    /no premium tier|No premium upsell|no premium upsell|Free tier covers everything|Free tier = full features|fully free, no premium|no per-seat fee|no per-seat license|sin plan premium|sin versión premium|プレミアムなし|プレミアム版なし|בלי גרסת פרימיום|без премиума|no participant cap|no player or student cap/,
  ],
  [
    `advertises a per-class student number that is not FREE_TIER_LIMITS.studentsPerClass (${FREE_TIER_LIMITS.studentsPerClass})`,
    // Any "<n> students per class" style claim where n is NOT the enforced cap. Built from
    // the real constant so raising or lowering the tier fails this test until the copy in all
    // six locales is updated with it — the drift that produced 140+ false claims last time.
    new RegExp(
      String.raw`\b(?!${FREE_TIER_LIMITS.studentsPerClass}\b)\d{1,3}\s?(students per class|students each|per classroom)`
      + String.raw`|(?!${FREE_TIER_LIMITS.studentsPerClass})\b\d{1,3} תלמידים בכיתה`
      + String.raw`|hasta (?!${FREE_TIER_LIMITS.studentsPerClass})\d{1,3} (alumnos|estudiantes) por clase`
      + String.raw`|upp till (?!${FREE_TIER_LIMITS.studentsPerClass})\d{1,3} elever per klass`,
    ),
  ],
  [
    'says the join code is 4 digits — ClassroomGameLobby.tsx:141 and utils/utils.ts:118 both emit six characters',
    /4-digit|4 digit code|4 ספרות|4-siffrig|4桁|4 dígitos|4-значн/,
  ],
  [
    'says five languages — the app ships six (en, he, sv, ja, es, ru)',
    /\bfive languages\b|\bFive languages\b|\b5 languages\b|\b5 idiomas\b|\bcinco idiomas\b|\b[Ff]em språk\b|5つの言語|\b5言語\b|\b5 שפות\b|\b5 языков\b/,
  ],
];

describe.each(FILES)('%s', (rel) => {
  const source = readFileSync(join(ROOT, rel), 'utf8');

  it.each(FORBIDDEN)('does not %s', (_why, pattern) => {
    const lines = source.split('\n');
    const offenders = lines
      .map((line, i) => ({ line, n: i + 1, m: line.match(pattern) }))
      .filter((x) => x.m)
      .map((x) => `  ${rel}:${x.n}  "${x.m![0]}"  in: ${x.line.trim().slice(0, 120)}`);
    expect(offenders.join('\n') || null).toBeNull();
  });
});
