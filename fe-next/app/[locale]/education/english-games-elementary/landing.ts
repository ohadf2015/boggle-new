import { buildEnglishLearnerLanding } from '../_englishLearner/buildLanding';
import { getEnglishGamesElementaryContent } from './content';
import { getElementaryClassGames } from './classGames';
import { elementaryExtraJsonLd } from './jsonLd';

const SLUG = 'english-games-elementary';
const KEYWORDS =
  'english games for elementary, english word games for kids, juegos de ingles para primaria, juegos de ingles para ninos, elementary esl games, primary english games, phonics word games classroom, sight word games elementary';

export function getEnglishGamesElementaryLanding(locale: string) {
  const c = getEnglishGamesElementaryContent(locale);
  return buildEnglishLearnerLanding({
    locale,
    slug: SLUG,
    accent: 'lime',
    keywords: KEYWORDS,
    content: c,
    classGames: getElementaryClassGames(locale),
    extraJsonLd: elementaryExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    ctas: {
      primary: '/education/classroom-game',
      secondary: '/daily/word-hunt',
      footerSecondary: '/education',
    },
    related: [
      { href: '/education/esl-word-games', labelKey: 'vocabulary', accent: 'cyan' },
      { href: '/education/games-for-teachers', labelKey: 'teachers', accent: 'purple' },
      { href: '/education', labelKey: 'hub', accent: 'lime' },
    ],
    learning: {
      educationalUse: ['ESL Practice', 'Phonics Practice', 'Vocabulary Building', 'Primary Classroom'],
      educationalLevel: ['Primary', 'Elementary School'],
      typicalAgeRange: '6-11',
      teaches: 'English letter sounds, short words, classroom vocabulary for young learners',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  });
}
