import { educationBreadcrumbLabels, type EducationLandingContent } from '@/lib/seo/educationLanding';
import { educationCourseJsonLd } from '@/lib/seo/educationStructuredData';
import { getGamesForTeachersContent } from './content';
import { educationPageLabel } from '@/lib/seo/educationPageLinks';

const SLUG = 'games-for-teachers';
const BASE = 'https://www.lexiclash.live';

const GEO_ANSWER: Record<string, { question: string; answer: string }> = {
  en: {
    question: 'How do teachers start a free classroom word game with no student logins?',
    answer:
      'Create a class in LexiClash Education and share a 6-character join code. Students play in any browser — Chromebook, phone, or tablet — with no app or student account. Use your own vocabulary list. A round takes 2–10 minutes for a warm-up, brain break, or sub day. The free plan fits 3 classes of up to 50 students.',
  },
  he: {
    question: 'איך מורה מתחיל משחק מילים חינמי בכיתה בלי חשבונות לתלמידים?',
    answer:
      'יוצרים כיתה ב-LexiClash Education ומשתפים קוד בן 6 תווים. התלמידים משחקים בכל דפדפן — Chromebook, טלפון או טאבלט — בלי אפליקציה ובלי חשבון. משתמשים ברשימת המילים שלכם. סבב נמשך 2–10 דקות לחימום, להפסקה או ליום מילוי מקום. המסלול החינמי מכסה 3 כיתות עד 50 תלמידים.',
  },
  es: {
    question: '¿Cómo empieza un docente un juego de palabras gratis sin cuentas de estudiantes?',
    answer:
      'Crea una clase en LexiClash Education y comparte un código de 6 caracteres. El alumnado juega en cualquier navegador — Chromebook, teléfono o tablet — sin app ni cuenta. Usa tu propia lista. Una ronda dura 2–10 minutos: calentamiento, pausa o día de suplencia. El plan gratis cubre 3 clases de hasta 50 estudiantes.',
  },
  sv: {
    question: 'Hur startar en lärare ett gratis klassrumsordspel utan elevkonton?',
    answer:
      'Skapa en klass i LexiClash Education och dela en kod på sex tecken. Eleverna spelar i valfri webbläsare — Chromebook, telefon eller surfplatta — utan app eller elevkonto. Använd din egen ordlista. En runda tar 2–10 minuter som uppvärmning, hjärnpaus eller vikariedag. Gratisplanen täcker 3 klasser med upp till 50 elever.',
  },
  ja: {
    question: '生徒アカウントなしで、教師が無料の授業用ワードゲームを始めるには？',
    answer:
      'LexiClash Educationでクラスを作り、6文字の参加コードを共有します。生徒はChromebook、スマホ、タブレットのブラウザで遊べます。アプリも生徒アカウントも不要です。自分の単語リストを使えます。1ラウンドは2〜10分で、ウォームアップ、休憩、代授業に向きます。無料プランは3クラス・各50人までです。',
  },
  ru: {
    question: 'Как учителю запустить бесплатную словесную игру без аккаунтов учеников?',
    answer:
      'Создайте класс в LexiClash Education и поделитесь кодом из 6 символов. Ученики играют в любом браузере — Chromebook, телефон или планшет — без приложения и аккаунта. Используйте свой список слов. Раунд занимает 2–10 минут: разминка, пауза или день замены. Бесплатный план покрывает 3 класса до 50 учеников.',
  },
};

/** Carried over verbatim from the page's old inline metadata export. */
const KEYWORDS =
  'word games for teachers, vocabulary games for teachers, classroom games for teachers, teacher word games, free games for teachers, classroom activities for teachers, no-prep classroom games, sub day word games, brain break word games, teacher vocabulary tools';
/**
 * Adapter onto the shared landing shape.
 *
 * The copy above stays exactly where it was written — this only re-labels it
 * for `components/education/EducationLandingTemplate`, so no string is retyped
 * and none can drift. `__tests__/landingTextParity.test.tsx` diffs the rendered
 * text, the link targets and the metadata export against snapshots taken from
 * the pre-migration page.
 */
export function getGamesForTeachersLanding(locale: string): EducationLandingContent {
  const c = getGamesForTeachersContent(locale);
  const bc = educationBreadcrumbLabels(locale);
  return {
    accent: 'purple',
    meta: {
      title: c.metaTitle,
      description: c.metaDescription,
      ogTitle: c.ogTitle,
      ogDescription: c.ogDescription,
      twitterDescription: c.twitterDescription,
      keywords: KEYWORDS,
    },
    hero: {
      facts: [],
      tag: c.heroTag,
      h1: c.heroH1,
      subtitle: c.heroSubtitle,
      primaryCta: { label: c.heroCtaStartGame, sublabel: c.ctaSubLabel, href: '/education/classroom-game' },
      secondaryCta: { label: c.heroCtaTeacherHub, sublabel: c.heroCtaTeacherHubSub, href: '/education' },
    },
    heroBanner: {
      title: `${c.heroH1.part1} ${c.heroH1.highlight} ${c.heroH1.part2}`,
      subtitle: c.heroSubtitle,
    },
    answer: GEO_ANSWER[locale] ?? GEO_ANSWER.en,
    sections: [
      { kind: 'features', title: c.whatYouGetTitle, items: c.features },
      { kind: 'cards', title: c.sections.howYouUse, items: c.useCases },
    ],
    revealSections: true,
    faqs: c.faqs,
    labels: { faqTitle: c.faqTitle, relatedTitle: c.relatedResourcesAriaLabel },
    related: [
      { href: '/education/vocabulary-games-classroom', label: c.relatedVocabLink, accent: 'lime' },
      { href: '/education/esl-word-games', label: c.relatedEslLink, accent: 'cyan' },
      { href: '/education/for-schools', label: c.relatedForSchoolsLink, accent: 'pink' },
    ],
    footerCta: {
      heading: c.sections.ctaHeading,
      highlight: c.sections.ctaSubtitle,
      ctas: [
        { label: c.sections.ctaPrimaryButtonLabel, href: '/education/classroom-game' },
        { label: c.sections.ctaSecondaryButtonLabel, href: '/education/vocabulary-games-classroom' },
      ],
    },
    breadcrumb: { home: bc.home, hub: bc.hub, current: educationPageLabel(SLUG, locale) },
    learning: {
      educationalUse: ['Classroom Activity', 'Formative Assessment', 'Vocabulary Building', 'Brain Break', 'Substitute Teacher Activity'],
      educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
      typicalAgeRange: '8-99',
      teaches: 'Vocabulary, spelling, word recognition, contextual usage',
    },
    extraJsonLd: [
      educationCourseJsonLd({
        name: c.metaTitle,
        description: c.metaDescription,
        url: `${BASE}/${locale}/education/${SLUG}`,
        locale,
      }),
    ],
  };
}
