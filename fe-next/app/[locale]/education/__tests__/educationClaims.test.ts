import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
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

/**
 * Comparison pages are DISCOVERED, not listed. The hardcoded list below was
 * extended by hand on 2026-08-31 after these pages were found making false
 * claims — but a hand-maintained list only protects the files someone
 * remembered, and the next `lexiclash-vs-*` page ships unguarded by default.
 * A real teacher (LogRocket 2026-08-29, our most engaged one) spent 50 minutes
 * reading exactly these pages while comparing us to competitors.
 */
/**
 * Education landing `page.tsx` files — DISCOVERED, like the comparison pages below.
 *
 * Added 2026-09-05. Only the hub's `page.tsx` was in scope before, so every JSON-LD
 * node on the twelve landing pages sat outside this guard — including the `offers`
 * array, which is exactly the text an answer engine quotes about pricing. A false
 * claim is worse in structured data than in prose, not better.
 */
function educationLandingPages(): string[] {
  const dir = join(ROOT, 'app', '[locale]', 'education');
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name.startsWith('__') || name.startsWith('.')) continue;
    let entries: string[];
    try {
      entries = readdirSync(join(dir, name));
    } catch {
      continue; // a file, not a route directory
    }
    if (entries.includes('page.tsx')) found.push(`app/[locale]/education/${name}/page.tsx`);
  }
  return found.sort();
}

/**
 * Every `lib/seo/*.ts` module — DISCOVERED.
 *
 * Added 2026-09-05 (round 2). `lib/seo/educationJsonLd.ts` builds the hub's
 * WebApplication node and was scanned by nothing, so it shipped "5 languages",
 * "no premium tier" and a "4-digit" join code straight into structured data for
 * months. Landing copy was guarded; the JSON-LD that describes the product to
 * every crawler was not. Scan the builders, not just the prose.
 */
function seoModules(): string[] {
  const dir = join(ROOT, 'lib', 'seo');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => `lib/seo/${f}`)
    .sort();
}

function comparisonPages(): string[] {
  const localeDir = join(ROOT, 'app', '[locale]');
  const found: string[] = [];
  for (const name of readdirSync(localeDir)) {
    if (!/^lexiclash-vs-|^best-online-word-games$/.test(name)) continue;
    for (const file of readdirSync(join(localeDir, name))) {
      if (file === 'page.tsx' || file === 'content.ts') {
        found.push(`app/[locale]/${name}/${file}`);
      }
    }
  }
  return found.sort();
}

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
  // Comparison pages sat OUTSIDE this guard until 2026-08-31, which is exactly why they
  // still claimed LexiClash was "fully free with no premium tier" long after that was
  // corrected everywhere else. A guard that does not cover a file cannot protect it —
  // so these are now discovered, not listed.
  ...comparisonPages(),
  ...educationLandingPages(),
  ...seoModules(),
  // The two layouts. `app/layout.tsx` sets the default description plus the OG and
  // Twitter cards, so a wrong count there rides on every page that does not override
  // them — it said "5 languages" while the pages under it said six. `[locale]/layout.tsx`
  // carries the sitewide WebApplication/WebSite JSON-LD.
  'app/layout.tsx',
  'app/[locale]/layout.tsx',
];

/**
 * Ground truth, all verified in code:
 *   lib/education/freeTierLimits.ts → 3 classes, 50 students/class, $9/mo Pro
 *   components/teacher/ProGate.tsx  → analytics + reports ARE behind the paywall
 *   i18n/config.ts                  → six locales
 */
const FORBIDDEN: Array<[string, RegExp]> = [
  [
    'promises the product is free forever, but Teacher Pro is a real paid tier',
    // Rewritten 2026-09-05. The old list spelled out capitalisations instead of using
    // the `i` flag, and named ONE phrasing per language — so `Gratis För Alltid` (sv),
    // `Gratis Por Siempre` (es), `חינם לנצח` (he) and `永遠に無料` (ja) were all live on
    // indexed pages while this test passed. Match the PROMISE ("this costs nothing,
    // ever"), not one translator's wording of it.
    /free forever|forever free|חינם ל(תמיד|נצח)|(för alltid gratis|gratis för alltid)|gratis (por|para) siempre|siempre gratis|永久無料|ずっと無料|永遠に無料|(навсегда|всегда) бесплатн/i,
  ],
  [
    'denies the premium tier or a per-seat limit that lib/education/freeTierLimits.ts enforces',
    // Same widening as above: `ingen premiumtier` (sv), `בלי פרימיום` (he) and
    // `プレミアム層なし` (ja) each denied the paid tier in a phrasing this list did not name.
    /no premium (tier|upsell)|free tier covers everything|free tier = full features|fully free, no premium|sin (plan |versión )?premium|プレミアム(層|版)?なし|בלי (גרסת )?פרימיום|ingen premium ?tier|без премиума|no participant cap|no player or student cap/i,
  ],
  [
    `advertises a per-class student number that is not FREE_TIER_LIMITS.studentsPerClass (${FREE_TIER_LIMITS.studentsPerClass})`,
    // Any "<n> students per class" style claim where n is NOT the enforced cap. Built from
    // the real constant so raising or lowering the tier fails this test until the copy in all
    // six locales is updated with it — the drift that produced 140+ false claims last time.
    new RegExp(
      String.raw`\b(?!${FREE_TIER_LIMITS.studentsPerClass}\b)\d{1,3}\s?(students per class|students each|students per classroom)`
      + String.raw`|(?!${FREE_TIER_LIMITS.studentsPerClass})\b\d{1,3} תלמידים בכיתה`
      + String.raw`|hasta (?!${FREE_TIER_LIMITS.studentsPerClass})\d{1,3} (alumnos|estudiantes) por clase`
      + String.raw`|upp till (?!${FREE_TIER_LIMITS.studentsPerClass})\d{1,3} elever per klass`
      // JA and RU had no pattern at all until 2026-09-05, which is how the JA hub FAQ
      // kept saying 生徒10人まで for five weeks after the cap moved to 50. `人` is the
      // counter for people; `1クラスあたり` ("per class") must not read as a class count.
      // JA had no pattern at all until 2026-09-05, which is how the JA hub FAQ kept
      // saying 生徒10人まで for five weeks after the cap moved to 50. `人` is the counter
      // for people. The `(?<!\d)` guard is load-bearing: without it the lookahead starts
      // mid-number and reads the correct `50人まで` as a bad `0人まで`.
      + String.raw`|生徒(?<!\d)(?!${FREE_TIER_LIMITS.studentsPerClass})\d{1,3}人`
      + String.raw`|(?<!\d)(?!${FREE_TIER_LIMITS.studentsPerClass})\d{1,3}人まで`,
      // Deliberately no Russian/`до N учеников` pattern: the comparison pages state
      // COMPETITORS' caps ("Kahoot ... до 5 учеников"), which are true and must stay.
      // A number guard cannot tell our cap from a rival's, so it is scoped to the
      // phrasings we only ever use about ourselves.
    ),
  ],
  [
    'says the join code is 4 digits — ClassroomGameLobby.tsx:141 and utils/utils.ts:118 both emit six characters',
    /4-digit|4 digit code|4 ספרות|4-siffrig|4桁|4 dígitos|4-значн/,
  ],
  [
    'claims no classroom feature is paywalled — a 4th class and reports/analytics both are',
    // Found on lexiclash-vs-blooket, in the SAME sentence that advertised "Teacher Pro
    // ($9/mo) adds unlimited classes and printable reports". A claim can contradict itself
    // inside one string and still read as persuasive; only the code settles it.
    // FREE_TIER_LIMITS.classes caps free classrooms and ProGate('analytics') gates reports.
    /never locks? classroom features behind a paywall|no classroom features? (are )?(locked|paywalled)|nothing is locked behind a paywall|never paywall/i,
  ],
  [
    // Verified 2026-09-05: zero occurrences of "CEFR" in lib/, components/, backend/,
    // shared/ or hooks/. Nothing reads, stores or assigns a CEFR band — it is copy only,
    // and it sat in the ESL page's TITLE TAG, the most prominent claim we make anywhere.
    // The real levers a teacher has are board size (5x5/6x6/7x7), minimum word length,
    // the round timer, and the three per-student tiers in lib/education/differentiation.ts.
    // Say those. If CEFR is ever implemented, delete this entry in the commit that does it.
    'claims CEFR levels, which no code in this repo implements',
    /\bCEFR\b|A1[–-]C2/i,
  ],
  [
    // The "five languages" phrasing was guarded; ENUMERATING five was not. A page can
    // list "English, Hebrew, Swedish, Japanese, and Spanish" and undersell the product
    // by a whole language without tripping a count regex. i18n/config.ts ships six.
    'enumerates our languages but omits Russian',
    /English[^.]{0,120}Hebrew[^.]{0,120}(?:Swedish[^.]{0,120}Japanese|Japanese[^.]{0,120}Swedish)[^.]{0,120}Spanish(?![^.]{0,120}Russian)/,
  ],
  [
    // Widened 2026-09-05 (round 2): the old regex only knew the noun "languages".
    // `lib/seo/educationJsonLd.ts` said "5 languages … each with its own dictionary"
    // in four locales and `esl-word-games` advertised "5 dictionaries" in its OG tag,
    // none of which the word "languages" catches. Count the THING, whatever it is
    // called — languages, dictionaries, word lists — because they are all the same six.
    'says five languages/dictionaries — the app ships six (en, he, sv, ja, es, ru)',
    new RegExp(
      String.raw`\b(five|5)\s+(languages|dictionaries|word lists)\b`
      + String.raw`|\b(5|cinco)\s+(idiomas|diccionarios)\b`
      + String.raw`|\b(5|fem)\s+(språk|ordböcker|ordlistor)\b`
      + String.raw`|(?<!ほかの)(?<!他の)(5つの言語|5言語|5つの辞書|5辞書)`
      + String.raw`|\b5 שפות|\b5 מילונים|חמש שפות|חמישה מילונים`
      + String.raw`|\b5 (языков|словарей)|пять (языков|словарей)`,
      'i',
    ),
  ],
  [
    // Round 4. The regex above demanded the noun IMMEDIATELY after the number, so
    // "Five built-in dictionaries" walked straight past it and rendered live on the
    // ESL page. Allow up to two adjectives between the count and the noun, and match
    // the spelled-out number in every language we ship.
    'says five languages/dictionaries with words between the count and the noun',
    new RegExp(
      String.raw`\b(five|5)(\s+[\w-]+){0,2}\s+(languages|dictionaries|word ?lists)\b`
      + String.raw`|\b(cinco|5)(\s+[\w-]+){0,2}\s+(idiomas|diccionarios)\b`
      + String.raw`|\b(fem|5)(\s+[\w-]+){0,2}\s+(språk|ordböcker|ordlistor)\b`
      + String.raw`|(?<!ほかの)(?<!他の)(五|5)つ?の?(内蔵)?(言語|辞書)`
      + String.raw`|(חמש|חמישה|5)\s+(\S+\s+){0,2}(שפות|מילונים)`
      + String.raw`|(пять|5)(\s+[\wа-яё-]+){0,2}\s+(языков|словарей)`,
      'i',
    ),
  ],
  [
    // Round 4. `3 classes of 10` had no noun after the number, so every
    // students-per-class pattern missed it while it rendered in the ESL feature list.
    // Match the shape "<classes> of <N>", digits or words, in all six languages.
    `advertises a free tier as classes of a number that is not ${FREE_TIER_LIMITS.studentsPerClass}`,
    new RegExp(
      // A RANGE is excluded: llms.txt says "a typical class of 25-30 fits the FREE
      // tier", which describes a real classroom rather than our cap, and is true.
      String.raw`class(?:es)?\s+of\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|ten|twenty|thirty)\b(?!\s*[-–])`
      + String.raw`|clases?\s+de\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|diez)\b`
      + String.raw`|klass(?:er)?\s+med\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|tio)\b`
      + String.raw`|כיתות\s+(?:עם|של)\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|עשרה)\b`
      + String.raw`|класс(?:а|ов)?\s+по\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|десять)\b`,
      'i',
    ),
  ],
  [
    // Round 4. The enumeration guard fixed one word ORDER. This page listed
    // "English, Spanish, Hebrew (RTL), Swedish, Japanese" and slipped through.
    // Order-independent: naming four of the five non-Russian languages without
    // naming Russian is an undercount however the list is arranged.
    'names four of our languages in a list that omits Russian',
    /(?=[^.!?]*English)(?=[^.!?]*Hebrew)(?=[^.!?]*Swedish)(?=[^.!?]*Japanese)(?=[^.!?]*Spanish)[^.!?]*(?<![Rr]ussian[^.!?]{0,200})(?:[.!?]|$)/,
  ],
];

/**
 * A comment that documents a false claim is not a false claim.
 *
 * Once `lib/seo/*.ts` came into scope, the header comments explaining WHY
 * "5 languages" and "4-digit" were wrong started failing the very tests that
 * forbid them. A guard that punishes writing the history down teaches people to
 * delete the history, so comment lines are skipped — in TypeScript sources only.
 * `public/llms.txt` is markdown where `#` starts a heading and every line is real
 * copy, so it is never comment-stripped.
 */
function isCommentLine(line: string, rel: string): boolean {
  if (!/\.tsx?$/.test(rel)) return false;
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

describe.each(FILES)('%s', (rel) => {
  const source = readFileSync(join(ROOT, rel), 'utf8');

  it.each(FORBIDDEN)('does not %s', (_why, pattern) => {
    const lines = source.split('\n').map((l) => (isCommentLine(l, rel) ? '' : l));
    const offenders = lines
      .map((line, i) => ({ line, n: i + 1, m: line.match(pattern) }))
      .filter((x) => x.m)
      .map((x) => `  ${rel}:${x.n}  "${x.m![0]}"  in: ${x.line.trim().slice(0, 120)}`);
    expect(offenders.join('\n') || null).toBeNull();
  });
});
