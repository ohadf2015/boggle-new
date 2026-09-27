import { buildEnglishLearnerLanding } from '../_englishLearner/buildLanding';
import { getIrregularVerbsGamesContent } from './content';
import { getIrregularVerbsClassGames } from './classGames';
import { irregularVerbsExtraJsonLd } from './jsonLd';

const SLUG = 'irregular-verbs-games';
const KEYWORDS =
  'irregular verb games, juegos de verbos irregulares en ingles, irregular verbs esl, past tense games english, go went gone game, teach irregular verbs, verb drills classroom';

export function getIrregularVerbsGamesLanding(locale: string) {
  const c = getIrregularVerbsGamesContent(locale);
  return buildEnglishLearnerLanding({
    locale,
    slug: SLUG,
    accent: 'cyan',
    keywords: KEYWORDS,
    content: c,
    classGames: getIrregularVerbsClassGames(locale),
    extraJsonLd: irregularVerbsExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    ctas: {
      primary: '/education/classroom-game',
      secondary: '/education/spelling-bee-practice',
      footerSecondary: '/education',
    },
    related: [
      { href: '/education/esl-word-games', labelKey: 'vocabulary', accent: 'cyan' },
      { href: '/education/spelling-bee-practice', labelKey: 'teachers', accent: 'pink' },
      { href: '/education', labelKey: 'hub', accent: 'lime' },
    ],
    learning: {
      educationalUse: ['ESL Practice', 'Grammar Practice', 'Verb Tense Drills'],
      educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
      typicalAgeRange: '10-99',
      teaches: 'English irregular verbs, past tense forms, past participles, and spelling of verb stems',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  });
}
