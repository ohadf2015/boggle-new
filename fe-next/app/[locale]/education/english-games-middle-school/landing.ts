import { buildEnglishLearnerLanding } from '../_englishLearner/buildLanding';
import { getEnglishGamesMiddleSchoolContent } from './content';
import { getMiddleSchoolEnglishClassGames } from './classGames';
import { middleSchoolExtraJsonLd } from './jsonLd';

const SLUG = 'english-games-middle-school';
const KEYWORDS =
  'english games for middle school, esl games for teens, juegos de ingles para secundaria, ingles para secundaria, middle school vocabulary games, efl games grade 6 7 8, teen english word games';

export function getEnglishGamesMiddleSchoolLanding(locale: string) {
  const c = getEnglishGamesMiddleSchoolContent(locale);
  return buildEnglishLearnerLanding({
    locale,
    slug: SLUG,
    accent: 'pink',
    keywords: KEYWORDS,
    content: c,
    classGames: getMiddleSchoolEnglishClassGames(locale),
    extraJsonLd: middleSchoolExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    ctas: {
      primary: '/education/classroom-game',
      secondary: '/education/duels',
      footerSecondary: '/education',
    },
    related: [
      { href: '/education/esl-word-games', labelKey: 'vocabulary', accent: 'cyan' },
      { href: '/education/games-for-teachers', labelKey: 'teachers', accent: 'purple' },
      { href: '/education', labelKey: 'hub', accent: 'lime' },
    ],
    learning: {
      educationalUse: ['ESL Practice', 'EFL Practice', 'Vocabulary Building', 'Secondary Classroom'],
      educationalLevel: ['Middle School', 'Secondary'],
      typicalAgeRange: '11-15',
      teaches: 'English academic vocabulary, spelling, prefixes and roots for teen learners',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  });
}
