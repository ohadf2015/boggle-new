import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FREE_TIER_LIMITS } from '@/lib/education/freeTierLimits';
import { layoutTranslations } from '@/translations/layout';
import { en } from '@/translations/en';
import { es } from '@/translations/es';
import { he } from '@/translations/he';
import { ja } from '@/translations/ja';
import { ru } from '@/translations/ru';
import { sv } from '@/translations/sv';

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
/**
 * Round 4 addition: `content.ts` is collected here too.
 *
 * Seven of the twelve education `content.ts` files were named by hand in FILES
 * below; the other five (`brain-breaks-word-games`, `early-finishers-activities`,
 * `end-of-year-classroom-activities`, `first-day-of-school-icebreakers`,
 * `indoor-recess-games`, `middle-school-word-games`) were scanned by nothing.
 * That is the same hand-list failure this function was written to end for
 * `page.tsx` — a landing page's prose is exactly as claim-bearing as its JSON-LD,
 * and the next slug someone adds ships unguarded by default under a fixed list.
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
    if (entries.includes('content.ts')) found.push(`app/[locale]/education/${name}/content.ts`);
  }
  return found.sort();
}

/**
 * Every `components/education/*.tsx` — DISCOVERED.
 *
 * Round 4. A shared component that carries its own copy renders on every landing
 * page at once, so a false claim there is the widest blast radius in the module,
 * and no guard has ever looked at one. `EducationHero.tsx` still carries the
 * history of "Built natively for 5 languages" in a header comment, which is the
 * proof that this surface has shipped exactly this defect before.
 */
function educationComponents(): string[] {
  const dir = join(ROOT, 'components', 'education');
  return readdirSync(dir)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => `components/education/${f}`)
    .sort();
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

/**
 * Every marketing/SEO surface under `app/[locale]`, plus the shared landing and promo
 * copy — DISCOVERED.
 *
 * Added round 4 (last mile). The education module was guarded to 1,519 assertions while
 * the homepage told every visitor, in its visible FAQ *and* in its FAQPage JSON-LD, that
 * "LexiClash supports five languages". The same claim was live on ~35 other pages: the
 * about page, the FAQ, the rules page, the leaderboard, the blog, and a dozen keyword
 * landing pages. Guarding the smaller surface hard and the larger one not at all is how
 * a claim survives four review rounds.
 *
 * `content.ts`, `faq.ts`, `data.ts`, `seoContent.ts`, `page.tsx` and `PageClient.tsx` are
 * where this repo puts per-page copy. Anything else under `app/[locale]` is behaviour.
 */
function siteWideMarketingPages(): string[] {
  const COPY_FILE = /^(content|faq|data|seoContent)\.ts$|^(page|PageClient)\.tsx$/;
  const out: string[] = [];
  const walk = (dir: string, rel: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('__') || entry.name.startsWith('.')) continue;
      const full = join(dir, entry.name);
      const next = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(full, next);
      } else if (COPY_FILE.test(entry.name)) {
        out.push(next);
      }
    }
  };
  walk(join(ROOT, 'app', '[locale]'), 'app/[locale]');
  for (const dirName of ['landing', 'promo']) {
    const dir = join(ROOT, 'components', dirName);
    for (const f of readdirSync(dir)) {
      if (/\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)) out.push(`components/${dirName}/${f}`);
    }
  }
  return out.sort();
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
  ...educationComponents(),
  ...siteWideMarketingPages(),
  ...seoModules(),
  // The two layouts. `app/layout.tsx` sets the default description plus the OG and
  // Twitter cards, so a wrong count there rides on every page that does not override
  // them — it said "5 languages" while the pages under it said six. `[locale]/layout.tsx`
  // carries the sitewide WebApplication/WebSite JSON-LD.
  'app/layout.tsx',
  'app/[locale]/layout.tsx',
];

/**
 * The hand-written entries above now overlap the discovered ones, so the same
 * file would otherwise get two identical describe blocks. Deduped rather than
 * pruned: the explicit names document intent, and deleting one the day the
 * discovery walk changes shape is how coverage quietly disappears.
 */
const SCANNED = [...new Set(FILES)].sort();

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
      //
      // Round 4: the `i` flag was missing, and every one of these phrasings begins a
      // sentence in real copy. `Hasta 5 alumnos por clase` (es) and `Upp till 5 elever
      // per klass` (sv) both sat in the shipped `pricing.*` namespace and both walked
      // past a case-sensitive `hasta`/`upp till`. The header comment two entries above
      // says exactly this about the free-forever list and it happened again here.
      'i',
    ),
  ],
  [
    'says the join code is 4 digits — ClassroomGameLobby.tsx:141 and utils/utils.ts:118 both emit six characters',
    // `fyrsiffrig` added round 4. The Swedish for "four-digit" is a compound adjective,
    // not the hyphenated `4-siffrig` this rule was written for, so eleven occurrences
    // across three teacher pages told Swedish teachers to project a four-digit code
    // that the product never generates. Match the word, not one way of spelling it.
    /4-digit|4 digit code|four-digit|4 ספרות|ארבע ספרות|4-siffrig|fyrsiffrig|4桁|四桁|4 dígitos|cuatro dígitos|4-значн|четырёхзначн/i,
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
      // Russian INFLECTS. Round 5: `на 5 языках` (prepositional) shipped in the
      // /ru/education meta description and og:description for weeks because this
      // pattern only knew the genitive `языков`. Match the stem plus the case
      // endings we actually write. `\b` is useless after Cyrillic here — JS `\w`
      // is ASCII-only, so a space after `языках` is not a word boundary; the
      // negative lookahead does the job instead.
      + String.raw`|\b5 (язык(?:ов|ах|ами|а)|словар(?:ей|ях|ями|я))(?![а-яё])`
      + String.raw`|пять (язык(?:ов|ах|ами|а)|словар(?:ей|ях|ями|я))(?![а-яё])`,
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
      + String.raw`|(пять|5)(\s+[\wа-яё-]+){0,2}\s+(язык(?:ов|ах|ами|а)|словар(?:ей|ях|ями|я))(?![а-яё])`,
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
      // A DURATION is excluded too. "Aperturas de inicio de clase de 5 minutos"
      // (five-minute class openers) is about the length of a lesson, not the size
      // of one, and this rule flagged it — the only false positive the sitewide
      // sweep produced. Excluded by unit, so a real "clases de 5 alumnos" still fails.
      String.raw`class(?:es)?\s+of\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|ten|twenty|thirty)\b(?!\s*[-–])(?!\s*(?:minute|second|hour|min\b|sec\b))`
      + String.raw`|clases?\s+de\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|diez)\b(?!\s*(?:minutos?|segundos?|horas?))`
      + String.raw`|klass(?:er)?\s+med\s+(?!${FREE_TIER_LIMITS.studentsPerClass}\b)(\d{1,3}|tio)\b(?!\s*(?:minuter|sekunder|timmar))`
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
  [
    /**
     * Round 4. Both enumeration entries above are written in ENGLISH ONLY, so they
     * could only ever fail on an English string. `landing.seo.faq3A` and
     * `landing.seo.whatIsContent` listed the same five languages and omitted Russian
     * in all six catalogues; English tripped, and the other five — which say exactly
     * the same false thing in their own words — did not.
     *
     * So the rule is generated per language from the names that language uses. Whole
     * string rather than sentence-scoped: naming all five of the non-Russian languages
     * anywhere in a string that never mentions Russian is an undercount regardless of
     * punctuation, and Japanese does not end sentences with `.` anyway.
     */
    'lists all five other languages without naming Russian, in any of our six languages',
    ((): RegExp => {
      const SETS: Array<{ others: string[]; russian: string }> = [
        { others: ['English', 'Hebrew', 'Swedish', 'Japanese', 'Spanish'], russian: 'Russian' },
        { others: ['ingl[ée]s', 'hebreo', 'sueco', 'japon[ée]s', 'espa[nñ]ol'], russian: 'ruso' },
        { others: ['engelska', 'hebreiska', 'svenska', 'japanska', 'spanska'], russian: 'ryska' },
        { others: ['אנגלית', 'עברית', 'שוודית', 'יפנית', 'ספרדית'], russian: 'רוסית' },
        { others: ['英語', 'ヘブライ語', 'スウェーデン語', '日本語', 'スペイン語'], russian: 'ロシア語' },
        { others: ['английск', 'иврит', 'шведск', 'японск', 'испанск'], russian: 'русск' },
      ];
      const clause = ({ others, russian }: { others: string[]; russian: string }) =>
        `(?:${others.map((n) => `(?=[\\s\\S]*${n})`).join('')}(?![\\s\\S]*${russian}))`;
      // `^`-anchored so the negative lookahead spans the WHOLE line or string.
      // Unanchored, the engine may start AFTER an earlier mention of Russian and
      // then honestly report that no Russian follows — a line reading
      // "Russian 1.34M … English, Hebrew, Swedish, Japanese, Spanish" would fail
      // a rule it actually satisfies.
      return new RegExp(`^(?:${SETS.map(clause).join('|')})`, 'i');
    })(),
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

describe.each(SCANNED)('%s', (rel) => {
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

/**
 * The translation catalogues, which no claims guard has ever read.
 *
 * `languageCountCopy.test.ts` already established that a source-file scan cannot
 * see these strings and that importing the objects is the only honest way to
 * check what ships — but it applies exactly ONE rule, the language undercount.
 * Every other claim in this file (free forever, the student cap, CEFR, the join
 * code length, the language enumeration) has never touched `translations/*.js`,
 * even though `education.*`, `teacher.*` and `landing.*` are rendered by the same
 * teacher-facing pages the file-scan guards. `pricing.*` is in scope too: it is
 * the paywall table's copy, and it advertised a student cap of its own.
 *
 * Objects, not files, for the same reason the language test gives: a catalogue is
 * one 15,000-line literal, and a line-based scan of it cannot say which namespace
 * a match belongs to. Namespace-scoped rather than whole-catalogue because the
 * comparison pages legitimately state COMPETITORS' caps and language counts.
 */
const CATALOGUES: Array<[string, unknown]> = [
  ['en', en], ['es', es], ['he', he], ['ja', ja], ['ru', ru], ['sv', sv],
];

/** Namespaces the education and teacher surfaces render. */
/**
 * `seo` added round 5. `seo.educationHub.description` and `.ogDescription` ARE the
 * /education hub's meta and og descriptions — the strings the critic found saying
 * "на 5 языках" while the same page's H1 said six. They are education copy by any
 * reasonable reading and were outside this filter purely because of where the
 * translator filed them.
 */
const TEACHER_NAMESPACE = /^(education|teacher|landing|pricing|seo)\./;

function walkStrings(node: unknown, path: string[] = []): Array<[string, string]> {
  if (typeof node === 'string') return [[path.join('.'), node]];
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node as Record<string, unknown>).flatMap(([k, v]) =>
    walkStrings(v, [...path, k]),
  );
}

describe.each(CATALOGUES)('translations/%s.js — education, teacher, landing and pricing copy', (locale, catalogue) => {
  const entries = walkStrings(catalogue).filter(([k]) => TEACHER_NAMESPACE.test(k));

  it('has strings to check', () => {
    // A silently-empty scan passes forever while covering nothing.
    expect(entries.length).toBeGreaterThan(100);
  });

  it.each(FORBIDDEN)('does not %s', (_why, pattern) => {
    const offenders = entries
      .filter(([, v]) => pattern.test(v))
      .map(([k, v]) => `  translations/${locale}.js  ${k}: ${JSON.stringify(v.slice(0, 140))}`);
    expect(offenders.join('\n') || null).toBeNull();
  });
});

/**
 * `translations/layout.ts` is the sitewide JSON-LD graph's description — the one
 * string that rides on EVERY education page's `<head>` regardless of what the page
 * itself says. It is checked whole: there are no namespaces to scope to, and every
 * string in it is metadata about the product.
 */
describe('translations/layout.ts — the sitewide JSON-LD and meta description', () => {
  const entries = walkStrings(layoutTranslations);

  it('has strings to check', () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it.each(FORBIDDEN)('does not %s', (_why, pattern) => {
    const offenders = entries
      .filter(([, v]) => pattern.test(v))
      .map(([k, v]) => `  translations/layout.ts  ${k}: ${JSON.stringify(v.slice(0, 140))}`);
    expect(offenders.join('\n') || null).toBeNull();
  });
});
