import type { Metadata } from 'next';
import Link from 'next/link';
import { generatePageMetadata } from '@/lib/seo/generatePageMetadata';
import { GamePageSeoContent } from '@/components/seo/GamePageSeoContent';
import {
  buildEducationFaqJsonLd,
  buildEducationOrgJsonLd,
  buildEducationBreadcrumbJsonLd,
  buildEducationCourseJsonLd,
  buildEducationWebApplicationJsonLd,
} from '@/lib/seo/educationJsonLd';
import { PageClient as EducationPageClient } from './PageClient';
import { educationSeoContent } from './seoContent';
import { getBrainBreaksContent } from './brain-breaks-word-games/content';
import { getIndoorRecessContent } from './indoor-recess-games/content';
import { getEndOfYearContent } from './end-of-year-classroom-activities/content';
import { getIcebreakersContent } from './first-day-of-school-icebreakers/content';
import { getEarlyFinishersContent } from './early-finishers-activities/content';
import { getMiddleSchoolContent } from './middle-school-word-games/content';


// The hub renders from a static content object keyed by locale — no cookies(),
// headers() or searchParams anywhere in the tree, so there is nothing to make it
// per-request. `force-dynamic` arrived incidentally in 506600208 (a Connections
// commit) and cost every visitor a server render. ISR matches /education/for-schools.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return generatePageMetadata({ seoKey: 'educationHub', path: '/education', locale });
}

export default async function EducationPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const content = educationSeoContent[locale] ?? educationSeoContent.en;
  const faqSchema = buildEducationFaqJsonLd(locale, content.faq);
  const orgSchema = buildEducationOrgJsonLd(locale);
  const breadcrumbSchema = buildEducationBreadcrumbJsonLd(locale);
  const courseSchema = buildEducationCourseJsonLd(locale);
  const webAppSchema = buildEducationWebApplicationJsonLd(locale);
  // Safe: schemas built from static seoContent + locale enum, not user input.
  // JSON.stringify escapes content for <script> context; same pattern as
  // app/[locale]/guides/page.tsx:73 and components/seo/FaqPageJsonLd.tsx.
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(courseSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      {faqSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      )}
      <EducationPageClient />
      <EducationResourceLinks locale={locale} />
      <GamePageSeoContent
        title={content.title}
        description={content.description}
        features={content.features}
        faq={content.faq}
      />
    </>
  );
}

// Server-rendered crawlable internal-link section. Surfaces sub-routes and
// English-only SEO landings to Googlebot + signals their priority via the
// PageRank flow from /education (priority 0.7 in sitemap).
const RESOURCE_TITLES: Record<string, { heading: string; subhead: string; cards: { duels: { title: string; desc: string }; classroom: { title: string; desc: string } } }> = {
  en: {
    heading: 'Explore Education Modes',
    subhead: 'Pick the right format for your classroom — quick 1v1 duels or live whole-class multiplayer.',
    cards: {
      duels: { title: 'Vocabulary Duels (1v1)', desc: 'Pair students for 2-3 minute head-to-head word battles.' },
      classroom: { title: 'Live Classroom Game', desc: 'Whole-class multiplayer; students join with a class code, no email needed.' },
    },
  },
  he: {
    heading: 'גלו מצבי לימוד',
    subhead: 'בחרו את הפורמט המתאים לכיתה — דואלי 1v1 מהירים או רב-משתתפים חי לכל הכיתה.',
    cards: {
      duels: { title: 'דואלי אוצר מילים (1v1)', desc: 'התאימו תלמידים לקרבות מילים של 2-3 דקות פנים מול פנים.' },
      classroom: { title: 'משחק כיתתי חי', desc: 'רב-משתתפים לכל הכיתה; התלמידים מצטרפים עם קוד כיתה, בלי אימייל.' },
    },
  },
  sv: {
    heading: 'Utforska utbildningslägen',
    subhead: 'Välj rätt format för ditt klassrum — snabba 1v1-dueller eller live-multiplayer för hela klassen.',
    cards: {
      duels: { title: 'Ordförrådsdueller (1v1)', desc: 'Para ihop elever för 2-3 minuters ordstrider mot varandra.' },
      classroom: { title: 'Live klassrumsspel', desc: 'Multiplayer för hela klassen; eleverna ansluter med en klasskod, ingen e-post behövs.' },
    },
  },
  ja: {
    heading: '教育モードを探索',
    subhead: 'クラスに最適なフォーマットを選択 — クイック1対1デュエルまたはクラス全体のライブマルチプレイヤー。',
    cards: {
      duels: { title: '語彙デュエル (1対1)', desc: '生徒をペアリングして2〜3分の単語バトルを実施。' },
      classroom: { title: 'ライブクラスルームゲーム', desc: 'クラス全体のマルチプレイヤー。生徒はクラスコードで参加でき、メールアドレスは不要です。' },
    },
  },
  es: {
    heading: 'Explora los modos educativos',
    subhead: 'Elige el formato adecuado para tu aula — duelos 1v1 rápidos o multijugador en vivo para toda la clase.',
    cards: {
      duels: { title: 'Duelos de vocabulario (1v1)', desc: 'Empareja estudiantes para batallas de palabras cara a cara de 2-3 minutos.' },
      classroom: { title: 'Juego de aula en vivo', desc: 'Multijugador para toda la clase; el alumnado entra con un código de clase, sin correo electrónico.' },
    },
  },
  ru: {
    heading: 'Режимы для обучения',
    subhead: 'Выберите подходящий формат для класса — быстрые дуэли 1 на 1 или живой мультиплеер для всего класса.',
    cards: {
      duels: { title: 'Словарные дуэли (1 на 1)', desc: 'Объедините учеников в пары для словесных баталий по 2–3 минуты один на один.' },
      classroom: { title: 'Живая игра для класса', desc: 'Мультиплеер для всего класса; ученики заходят по коду класса, без электронной почты.' },
    },
  },
};

// Comparison page earns organic traffic for "LexiClash vs Kahoot" but is under-linked
// from high-authority education hub — text link adds PageRank flow with zero layout change.
const COMPARE_LINK_TEXT: Record<string, string> = {
  en: 'See how LexiClash compares: LexiClash vs Kahoot — features, price, and classroom fit.',
  he: 'ראו איך LexiClash משתווה: LexiClash מול Kahoot — תכונות, מחיר והתאמה לכיתה.',
  sv: 'Se hur LexiClash jämförs: LexiClash vs Kahoot — funktioner, pris och klassrumsanpassning.',
  ja: 'LexiClashの比較を見る：LexiClash対Kahoot — 機能、価格、教室への適合性。',
  es: 'Compara LexiClash: LexiClash vs Kahoot — funciones, precio y uso en el aula.',
  ru: 'Сравните LexiClash: LexiClash против Kahoot — функции, цена и применение в классе.',
};
const COMPARE_LINK_ANCHOR: Record<string, string> = {
  en: 'LexiClash vs Kahoot',
  he: 'LexiClash מול Kahoot',
  sv: 'LexiClash vs Kahoot',
  ja: 'LexiClash対Kahoot',
  es: 'LexiClash vs Kahoot',
  ru: 'LexiClash против Kahoot',
};

type ResourceCard = { badge: string; title: string; desc: string };
const RESOURCE_CARDS: Record<string, { heading: string; subhead: string; vocab: ResourceCard; esl: ResourceCard; teachers: ResourceCard; spelling: ResourceCard; sightWords: ResourceCard; forSchools: ResourceCard }> = {
  en: {
    heading: 'Teacher Guides',
    subhead: 'Deep-dive landing pages on specific use cases, with comparison tables, FAQs, and free word lists.',
    vocab: { badge: 'Guide', title: 'Vocabulary Games for the Classroom', desc: 'No signup, 6 languages, free for teachers — vs Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'ESL Word Games Online', desc: 'CEFR-scaled (A1→C2), 6 dictionaries, no student signup.' },
    teachers: { badge: 'For Teachers', title: 'Word Games for Teachers', desc: 'Sub-day, brain-break, warm-up — zero prep, free 30-day trial.' },
    spelling: { badge: 'Spelling Bee', title: 'Spelling Bee Practice Online', desc: '4-week training plan, custom word lists, 1v1 duels — Scripps prep.' },
    sightWords: { badge: 'Sight Words', title: 'Sight Words Practice (Dolch & Fry)', desc: 'Flashcards, matching & spelling drills built from your own Dolch/Fry list.' },
    forSchools: { badge: 'For Schools', title: 'LexiClash for Schools', desc: 'Free trial for teachers — school plans from $149/year, no student logins.' },
  },
  he: {
    heading: 'מדריכים למורים',
    subhead: 'דפי נחיתה מעמיקים למקרי שימוש ספציפיים, עם טבלאות השוואה, שאלות נפוצות ורשימות מילים חינמיות.',
    vocab: { badge: 'מדריך', title: 'משחקי אוצר מילים לכיתה', desc: 'בלי הרשמה, 6 שפות, חינם למורים — מול Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'אנגלית', title: 'משחקי מילים באנגלית כשפה זרה', desc: 'מדורג לפי CEFR (A1→C2), 6 מילונים, בלי הרשמת תלמידים.' },
    teachers: { badge: 'למורים', title: 'משחקי מילים למורים', desc: 'יום מילוי מקום, הפסקה מרעננת, חימום — אפס הכנה, ניסיון חינם 30 יום.' },
    spelling: { badge: 'איות', title: 'תרגול תחרות איות אונליין', desc: 'תוכנית אימון של 4 שבועות, רשימות מילים מותאמות, דואלי 1v1 — הכנה לתחרות.' },
    sightWords: { badge: 'מילים נפוצות', title: 'תרגול Sight Words (Dolch ו-Fry)', desc: 'כרטיסיות, התאמות ואיות — מבוסס על רשימת המילים שלכם.' },
    forSchools: { badge: 'לבתי ספר', title: 'LexiClash לבתי ספר', desc: 'ניסיון חינם למורים — תוכניות בית ספר מ-$149/שנה, בלי הרשמת תלמידים.' },
  },
  sv: {
    heading: 'Lärarguider',
    subhead: 'Fördjupande sidor om specifika användningsfall, med jämförelsetabeller, vanliga frågor och gratis ordlistor.',
    vocab: { badge: 'Guide', title: 'Ordförrådsspel för klassrummet', desc: 'Ingen registrering, 6 språk, gratis för lärare — jämfört med Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'Ordspel för engelska online', desc: 'CEFR-skalad (A1→C2), 6 ordböcker, ingen elevregistrering.' },
    teachers: { badge: 'För lärare', title: 'Ordspel för lärare', desc: 'Vikariedag, hjärnpaus, uppvärmning — noll förberedelse, 30 dagars gratis provperiod.' },
    spelling: { badge: 'Stavning', title: 'Stavningstävling online', desc: '4-veckors träningsplan, anpassade ordlistor, 1v1-dueller — tävlingsförberedelse.' },
    sightWords: { badge: 'Sight Words', title: 'Träna sight words (Dolch & Fry)', desc: 'Flashcards, matchning och stavning från din egen ordlista.' },
    forSchools: { badge: 'För skolor', title: 'LexiClash för skolor', desc: 'Gratis provperiod för lärare — skolplaner från $149/år, ingen elevinloggning.' },
  },
  ja: {
    heading: '教師向けガイド',
    subhead: '比較表、よくある質問、無料単語リスト付きの、具体的な活用法を深掘りするページ。',
    vocab: { badge: 'ガイド', title: '教室向け語彙ゲーム', desc: '登録不要、6言語、教師に無料 — Quizlet/Kahoot/Wordwallと比較。' },
    esl: { badge: 'ESL', title: 'オンライン英語単語ゲーム', desc: 'CEFR準拠（A1→C2）、6つの辞書、生徒の登録不要。' },
    teachers: { badge: '教師向け', title: '教師のための単語ゲーム', desc: '代行日、頭の休憩、ウォームアップ — 準備ゼロ、30日間無料トライアル。' },
    spelling: { badge: 'スペリング', title: 'オンラインスペリング練習', desc: '4週間のトレーニングプラン、カスタム単語リスト、1対1デュエル — 大会対策。' },
    sightWords: { badge: 'サイトワード', title: 'サイトワード練習 (Dolch & Fry)', desc: '自分の単語リストでフラッシュカード・マッチング・スペリング練習。' },
    forSchools: { badge: '学校向け', title: '学校向けLexiClash', desc: '教師向け無料トライアル — 学校プランは年$149から、生徒ログイン不要。' },
  },
  es: {
    heading: 'Guías para docentes',
    subhead: 'Páginas detalladas sobre casos de uso específicos, con tablas comparativas, preguntas frecuentes y listas de palabras gratuitas.',
    vocab: { badge: 'Guía', title: 'Juegos de vocabulario para el aula', desc: 'Sin registro, 6 idiomas, gratis para docentes — frente a Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'Juegos de palabras en inglés online', desc: 'Escalado por CEFR (A1→C2), 6 diccionarios, sin registro de estudiantes.' },
    teachers: { badge: 'Para docentes', title: 'Juegos de palabras para docentes', desc: 'Día de sustitución, descanso mental, calentamiento — cero preparación, prueba gratis 30 días.' },
    spelling: { badge: 'Concurso de Ortografía', title: 'Práctica de concurso de ortografía online', desc: 'Plan de entrenamiento de 4 semanas, listas personalizadas, duelos 1v1 — preparación para concursos.' },
    sightWords: { badge: 'Sight Words', title: 'Práctica de sight words (Dolch y Fry)', desc: 'Tarjetas, emparejamientos y deletreo desde tu propia lista.' },
    forSchools: { badge: 'Para escuelas', title: 'LexiClash para escuelas', desc: 'Prueba gratis para docentes — planes escolares desde $149/año, sin inicio de sesión de estudiantes.' },
  },
  ru: {
    heading: 'Гиды для учителей',
    subhead: 'Подробные страницы по конкретным сценариям — со сравнительными таблицами, ответами на вопросы и бесплатными списками слов.',
    vocab: { badge: 'Гид', title: 'Словарные игры для класса', desc: 'Без регистрации, 6 языков, бесплатно для учителей — против Quizlet/Kahoot/Wordwall.' },
    esl: { badge: 'ESL', title: 'Онлайн-игры по английским словам', desc: 'По шкале CEFR (A1→C2), 6 словарей, без регистрации учеников.' },
    teachers: { badge: 'Для учителей', title: 'Словесные игры для учителей', desc: 'День замены, перемена для мозга, разминка — ноль подготовки, бесплатно 30 дней.' },
    spelling: { badge: 'Орфография', title: 'Онлайн-практика орфографии', desc: '4-недельный план тренировок, свои списки слов, дуэли 1 на 1 — подготовка к конкурсу.' },
    sightWords: { badge: 'Sight Words', title: 'Практика sight words (Dolch и Fry)', desc: 'Карточки, совпадения и правописание по вашему списку слов.' },
    forSchools: { badge: 'Для школ', title: 'LexiClash для школ', desc: 'Бесплатный пробный период для учителей — школьные планы от $149/год, без входа для учеников.' },
  },
};

function EducationResourceLinks({ locale }: { locale: string }) {
  const lang = locale in RESOURCE_TITLES ? locale : 'en';
  const t = RESOURCE_TITLES[lang];
  const rc = RESOURCE_CARDS[lang] ?? RESOURCE_CARDS.en;

  return (
    <section aria-label="Education resources" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8 border-t-3 border-neo-black/30">
      <h2 className="font-neo-display text-2xl sm:text-3xl font-black uppercase text-neo-white">
        {t.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm sm:text-base text-neo-gray-200">{t.subhead}</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link
          href={`/${locale}/education/duels`}
          className="group rounded-neo border-3 border-neo-black bg-neo-pink p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <h3 className="font-neo-display text-lg font-black uppercase text-neo-white">{t.cards.duels.title}</h3>
          <p className="mt-2 text-sm text-neo-white">{t.cards.duels.desc}</p>
          <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-lime">→</span>
        </Link>
        <Link
          href={`/${locale}/education/classroom-game`}
          className="group rounded-neo border-3 border-neo-black bg-neo-cyan p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <h3 className="font-neo-display text-lg font-black uppercase text-neo-navy">{t.cards.classroom.title}</h3>
          <p className="mt-2 text-sm text-neo-navy/90">{t.cards.classroom.desc}</p>
          <span className="mt-3 inline-block font-neo-display text-xs font-black uppercase tracking-widest text-neo-navy">→</span>
        </Link>
      </div>

      <h2 className="mt-12 font-neo-display text-2xl sm:text-3xl font-black uppercase text-neo-white">
        {rc.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm sm:text-base text-neo-gray-200">
        {rc.subhead}
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/${locale}/education/vocabulary-games-classroom`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-cyan px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{rc.vocab.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.vocab.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.vocab.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/esl-word-games`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-cyan px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{rc.esl.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.esl.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.esl.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/games-for-teachers`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-purple px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">{rc.teachers.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.teachers.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.teachers.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/spelling-bee-practice`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-pink px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-white">{rc.spelling.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.spelling.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.spelling.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/sight-words-practice`}
          className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-lime px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-navy">{rc.sightWords.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-neo-white">{rc.sightWords.title}</h3>
          <p className="mt-2 text-xs text-neo-gray-200">{rc.sightWords.desc}</p>
        </Link>
        <Link
          href={`/${locale}/education/for-schools`}
          className="rounded-neo border-3 border-neo-black bg-neo-lime p-5 shadow-hard transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg"
          data-ph-capture-attribute-source="edu_hub_for_schools_card"
        >
          <span className="inline-block border-2 border-neo-black bg-neo-navy px-2 py-0.5 font-neo-display text-[10px] font-black uppercase tracking-widest text-neo-lime">{rc.forSchools.badge}</span>
          <h3 className="mt-3 font-neo-display text-base font-black uppercase text-black">{rc.forSchools.title}</h3>
          <p className="mt-2 text-xs text-black/70">{rc.forSchools.desc}</p>
        </Link>
      </div>

      <TeacherMomentLinks locale={locale} lang={lang} />

      <p className="mt-6 text-sm text-neo-gray-300">
        {(() => {
          const full = COMPARE_LINK_TEXT[lang] ?? COMPARE_LINK_TEXT.en;
          const anchor = COMPARE_LINK_ANCHOR[lang] ?? COMPARE_LINK_ANCHOR.en;
          const [before, after] = full.split(anchor);
          return (
            <>
              {before}
              <Link href={`/${locale}/lexiclash-vs-kahoot`} className="underline underline-offset-2 hover:text-neo-white">
                {anchor}
              </Link>
              {after ?? ''}
            </>
          );
        })()}
      </p>
    </section>
  );
}

// ─── Teacher-moment landings ───
// These six pages were orphans: reachable from the sitemap but linked from
// nowhere, which is a weak discovery signal and passes no internal PageRank.
// Labels come from each page's own localized content file rather than a new
// translation block, so there is exactly one place the copy lives.
const MOMENTS_HEADING: Record<string, { heading: string; subhead: string }> = {
  en: { heading: 'Pick your moment', subhead: 'Not a feature list — the specific situations teachers actually search for, each with a plan you can run today.' },
  he: { heading: 'בחרו את הרגע', subhead: 'לא רשימת תכונות — המצבים האמיתיים שמורים מחפשים, כל אחד עם תוכנית שאפשר להפעיל היום.' },
  sv: { heading: 'Välj ditt läge', subhead: 'Ingen funktionslista — de faktiska situationer lärare söker på, var och en med en plan du kan köra idag.' },
  ja: { heading: '場面から選ぶ', subhead: '機能一覧ではなく、先生が実際に検索する場面ごとに、今日すぐ使える進行プランを用意しました。' },
  es: { heading: 'Elige tu momento', subhead: 'No es una lista de funciones: son las situaciones que el profesorado busca de verdad, cada una con un plan para hoy.' },
  ru: { heading: 'Выберите момент', subhead: 'Не список функций — реальные ситуации, которые ищут учителя, и готовый план для каждой.' },
};

const MOMENT_ACCENT: Record<string, string> = {
  'brain-breaks-word-games': 'text-neo-lime',
  'indoor-recess-games': 'text-neo-cyan',
  'end-of-year-classroom-activities': 'text-neo-pink',
  'first-day-of-school-icebreakers': 'text-neo-purple',
  'early-finishers-activities': 'text-neo-lime',
  'middle-school-word-games': 'text-neo-pink',
};

function TeacherMomentLinks({ locale, lang }: { locale: string; lang: string }) {
  const copy = MOMENTS_HEADING[lang] ?? MOMENTS_HEADING.en;
  const moments = [
    { slug: 'brain-breaks-word-games', c: getBrainBreaksContent(locale) },
    { slug: 'indoor-recess-games', c: getIndoorRecessContent(locale) },
    { slug: 'end-of-year-classroom-activities', c: getEndOfYearContent(locale) },
    { slug: 'first-day-of-school-icebreakers', c: getIcebreakersContent(locale) },
    { slug: 'early-finishers-activities', c: getEarlyFinishersContent(locale) },
    { slug: 'middle-school-word-games', c: getMiddleSchoolContent(locale) },
  ];

  return (
    <>
      <h2 className="mt-12 font-neo-display text-2xl font-black uppercase text-neo-white sm:text-3xl">
        {copy.heading}
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-neo-gray-200 sm:text-base">{copy.subhead}</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {moments.map(({ slug, c }) => (
          <Link
            key={slug}
            href={`/${locale}/education/${slug}`}
            className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-5 shadow-hard transition-transform duration-150 ease-out hover:-translate-y-0.5"
          >
            <h3 className={`font-neo-display text-base font-black uppercase ${MOMENT_ACCENT[slug]}`}>
              {c.breadcrumb.current}
            </h3>
            {/* The answer-first question doubles as the card's promise. */}
            <p className="mt-2 text-xs leading-relaxed text-neo-gray-200">{c.answer.question}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
