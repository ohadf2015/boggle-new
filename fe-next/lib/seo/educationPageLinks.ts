/**
 * The education landing pages, and what to call each one in each language.
 *
 * Why this exists: before 2026-09-05 the footer linked 5 of the 12 landing pages
 * and the `/education` hub added one more. The six newest pages — the ones with
 * the best schema and the deepest content — had ZERO inbound internal links and
 * were discoverable only through the XML sitemap and llms.txt. Internal links are
 * how PageRank and crawl budget actually reach a page, so the best pages on the
 * module were also the least likely to rank.
 *
 * Every label here is HARVESTED, not translated: new-pattern pages contribute
 * their `breadcrumb.current`, old-pattern pages their `metaTitle` trimmed at the
 * first separator. Both were already written by whoever localized the page. No
 * label in this file was invented by the tooling that assembled it — which is the
 * rule for this repo, where a subagent once shipped fabricated Swedish word lists.
 *
 * `sight-words-practice` is English in all six columns on purpose: its content
 * module has no per-locale blocks and its non-EN routes are noindex.
 *
 * `app/[locale]/education/__tests__/educationInternalLinks.test.ts` asserts this
 * registry covers every directory that has a `page.tsx`, so a new landing page
 * cannot ship orphaned the way the last six did.
 */
import type { EducationAccent } from './educationLanding';

export const EDUCATION_LINK_LOCALES = ['en', 'he', 'es', 'sv', 'ja', 'ru'] as const;
export type EducationLinkLocale = (typeof EDUCATION_LINK_LOCALES)[number];

export type EducationPageLink = {
  /** Directory name under `app/[locale]/education/`, and the URL segment. */
  slug: string;
  accent: EducationAccent;
  /** Localized link text. Also used as the BreadcrumbList `current` name. */
  label: Record<EducationLinkLocale, string>;
};

const LABELS: Record<string, Record<EducationLinkLocale, string>> = {
  'vocabulary-games-classroom': { en: 'Free Classroom Vocabulary Games', he: 'משחקי אוצר מילים חינמיים בכיתה', es: 'Juegos de vocabulario gratis para el aula', sv: 'Gratis ordförråd spel för klassrummet', ja: '無料の教室向け語彙ゲーム', ru: 'Бесплатные словарные игры для класса' },
  'esl-word-games': { en: 'ESL Vocabulary Games Online', he: 'משחקי אנגלית חינמיים', es: 'Juegos de Vocabulario en Inglés Gratis Online', sv: 'Gratis Engelskaspel', ja: '無料英語ゲーム', ru: 'Бесплатные игры английского языка' },
  'games-for-teachers': { en: 'Free Word Games for Teachers', he: 'משחקי מילים חינמיים למורים', es: 'Juegos gratis para maestros', sv: 'Gratis ordspel för lärare', ja: '無料単語ゲーム', ru: 'Бесплатные словесные игры для учителей' },
  'for-schools': { en: 'Free Vocabulary & ESL Word Games for Schools', he: 'משחקי אוצר מילים ואנגלית לבתי ספר', es: 'Juegos de vocabulario y ESL gratis para escuelas', sv: 'Gratis ordförråds- och ESL-ordspel för skolor', ja: '学校向け無料語彙・ESL単語ゲーム', ru: 'Бесплатные игры на словарный запас для школ' },
  'spelling-bee-practice': { en: 'Spelling Bee Practice Online', he: 'תרגול איות חינם', es: 'Práctica de Ortografía Online', sv: 'Stavningspraktik Online', ja: 'スペリング練習オンライン', ru: 'Практика орфографии бесплатно' },
  'sight-words-practice': { en: 'Sight Words Practice Online', he: 'Sight Words Practice Online', es: 'Sight Words Practice Online', sv: 'Sight Words Practice Online', ja: 'Sight Words Practice Online', ru: 'Sight Words Practice Online' },
  'brain-breaks-word-games': { en: 'Brain breaks for classrooms', he: 'הפסקות קשב', es: 'Pausas de concentración', sv: 'Hjärnpauser', ja: '脳トレ休憩', ru: 'Физминутки' },
  'indoor-recess-games': { en: 'Indoor recess games', he: 'משחקי הפסקה בתוך הכיתה', es: 'Juegos para recreo cubierto', sv: 'Inomhusspel för rast', ja: '室内休み時間ゲーム', ru: 'Игры для переменки в помещении' },
  'early-finishers-activities': { en: 'Early finishers activities', he: 'פעילויות לתלמידים שמסיימים מוקדם', es: 'Actividades para estudiantes que terminan primero', sv: 'Aktiviteter för elever som är klara först', ja: '課題を終わらせた生徒向けアクティビティ', ru: 'Занятия для учеников, закончивших раньше' },
  'first-day-of-school-icebreakers': { en: 'First Day Icebreakers', he: 'שובר קרח ביום ראשון', es: 'Rompehielos del Primer Día', sv: 'Första Dagen Isbrytare', ja: '学年始めアイスブレーカー', ru: 'Ледокол День Знаний' },
  'end-of-year-classroom-activities': { en: 'End of Year Activities', he: 'פעילויות סוף שנה', es: 'Actividades de Fin de Año', sv: 'Aktiviteter Sista Veckan', ja: '学年末の活動', ru: 'Мероприятия Конца Года' },
  'middle-school-word-games': { en: 'Middle School Word Games', he: 'משחקי מילים לחטיבת ביניים', es: 'Juegos de Palabras para Secundaria', sv: 'Ordspel för Högstadiet', ja: '中学生向けの言葉ゲーム', ru: 'Словесные игры для средней школы' },
};

/**
 * Ordered for the hub and the footer: the four evergreen tool pages first, then
 * the practice drills, then the six teacher-moment pages. A reader scanning the
 * list should meet the broadest page first.
 */
export const EDUCATION_PAGES: readonly EducationPageLink[] = [
  { slug: 'vocabulary-games-classroom', accent: 'lime', label: LABELS['vocabulary-games-classroom'] },
  { slug: 'esl-word-games', accent: 'cyan', label: LABELS['esl-word-games'] },
  { slug: 'games-for-teachers', accent: 'purple', label: LABELS['games-for-teachers'] },
  { slug: 'for-schools', accent: 'pink', label: LABELS['for-schools'] },
  { slug: 'spelling-bee-practice', accent: 'lime', label: LABELS['spelling-bee-practice'] },
  { slug: 'sight-words-practice', accent: 'cyan', label: LABELS['sight-words-practice'] },
  { slug: 'brain-breaks-word-games', accent: 'purple', label: LABELS['brain-breaks-word-games'] },
  { slug: 'indoor-recess-games', accent: 'pink', label: LABELS['indoor-recess-games'] },
  { slug: 'early-finishers-activities', accent: 'lime', label: LABELS['early-finishers-activities'] },
  { slug: 'first-day-of-school-icebreakers', accent: 'cyan', label: LABELS['first-day-of-school-icebreakers'] },
  { slug: 'end-of-year-classroom-activities', accent: 'purple', label: LABELS['end-of-year-classroom-activities'] },
  { slug: 'middle-school-word-games', accent: 'pink', label: LABELS['middle-school-word-games'] },
] as const;

function linkLocale(locale: string): EducationLinkLocale {
  return (EDUCATION_LINK_LOCALES as readonly string[]).includes(locale)
    ? (locale as EducationLinkLocale)
    : 'en';
}

/** The localized link text for a page. Throws on an unknown slug — a typo in a
 *  `related` list should fail the build, not render an empty anchor. */
export function educationPageLabel(slug: string, locale: string): string {
  const page = EDUCATION_PAGES.find((p) => p.slug === slug);
  if (!page) throw new Error(`Unknown education page slug: ${slug}`);
  return page.label[linkLocale(locale)];
}

/** Locale-less path for a slug, e.g. `/education/esl-word-games`. */
export function educationPagePath(slug: string): string {
  return `/education/${slug}`;
}

/**
 * Three siblings to link from `slug`'s "Related" block.
 *
 * Deliberately a rotation over the registry order rather than a hand-picked list
 * per page: a hand-picked map is what produced the one-way silo where none of the
 * six older pages linked to any of the six newer ones. A rotation guarantees every
 * page both links out and is linked to, and stays correct when a page is added.
 */
export function educationRelatedPages(slug: string, count = 3): EducationPageLink[] {
  const i = EDUCATION_PAGES.findIndex((p) => p.slug === slug);
  if (i < 0) throw new Error(`Unknown education page slug: ${slug}`);
  const out: EducationPageLink[] = [];
  for (let step = 1; out.length < count && step < EDUCATION_PAGES.length; step += 1) {
    out.push(EDUCATION_PAGES[(i + step) % EDUCATION_PAGES.length]);
  }
  return out;
}
