import { buildEnglishLearnerLanding } from '../_englishLearner/buildLanding';
import { getEnglishVocabularyTopicsContent } from './content';
import { getVocabTopicsClassGames } from './classGames';
import { vocabTopicsExtraJsonLd } from './jsonLd';

const SLUG = 'english-vocabulary-topics';
const KEYWORDS =
  'english vocabulary by topic, vocabulario en ingles por temas, food vocabulary games, animals vocabulary esl, travel english words, school vocabulary list, topic word lists classroom';

export function getEnglishVocabularyTopicsLanding(locale: string) {
  const c = getEnglishVocabularyTopicsContent(locale);
  return buildEnglishLearnerLanding({
    locale,
    slug: SLUG,
    accent: 'lime',
    keywords: KEYWORDS,
    content: c,
    classGames: getVocabTopicsClassGames(locale),
    extraJsonLd: vocabTopicsExtraJsonLd(locale, c.metaTitle, c.metaDescription),
    ctas: {
      primary: '/daily/word-hunt',
      secondary: '/education/classroom-game',
      footerSecondary: '/education',
    },
    related: [
      { href: '/education/vocabulary-games-classroom', labelKey: 'vocabulary', accent: 'lime' },
      { href: '/education/esl-word-games', labelKey: 'teachers', accent: 'cyan' },
      { href: '/education', labelKey: 'hub', accent: 'pink' },
    ],
    learning: {
      educationalUse: ['Vocabulary Building', 'ESL Practice', 'Thematic Word Lists'],
      educationalLevel: ['Primary', 'Secondary', 'Adult Education'],
      typicalAgeRange: '8-99',
      teaches: 'English topic vocabulary for food, animals, travel, and school, practised as playable word lists',
      learningResourceType: 'Game',
      educationalRole: 'student',
    },
  });
}
