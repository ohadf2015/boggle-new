import { buildEnglishLearnerLanding } from '../_englishLearner/buildLanding';
import { getEnglishGamesAdultsContent } from './content';
import { getAdultsClassGames } from './classGames';
import { adultsExtraJsonLd } from './jsonLd';

const SLUG = 'english-games-adults';
const KEYWORDS =
  'english games for adults, learn english by playing, aprender ingles jugando para adultos, adult esl games, efl games for adults, workplace english games, conversation starter word games';

export function getEnglishGamesAdultsLanding(locale: string) {
  const c = getEnglishGamesAdultsContent(locale);
  return buildEnglishLearnerLanding({
    locale,
    slug: SLUG,
    accent: 'purple',
    keywords: KEYWORDS,
    content: c,
    classGames: getAdultsClassGames(locale),
    extraJsonLd: adultsExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    ctas: {
      primary: '/daily/word-hunt',
      secondary: '/education/classroom-game',
      footerSecondary: '/education',
    },
    related: [
      { href: '/education/esl-word-games', labelKey: 'vocabulary', accent: 'cyan' },
      { href: '/education/games-for-teachers', labelKey: 'teachers', accent: 'purple' },
      { href: '/education', labelKey: 'hub', accent: 'lime' },
    ],
    learning: {
      educationalUse: ['Adult Education', 'ESL Practice', 'EFL Practice', 'Workplace English'],
      educationalLevel: ['Adult Education'],
      typicalAgeRange: '16-99',
      teaches: 'English collocations, register, workplace verbs, and conversation vocabulary for adults',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  });
}
